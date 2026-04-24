import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServiceClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File
    const clienteId = formData.get('cliente_id') as string

    if (!file || !clienteId) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    // 1. Subir PDF a Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const fileName = `${user.id}/${clienteId}/${Date.now()}-${file.name}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('polizas-pdf')
      .upload(fileName, fileBuffer, { contentType: 'application/pdf' })

    if (uploadError) {
      return NextResponse.json({ error: 'Error al guardar PDF: ' + uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('polizas-pdf')
      .getPublicUrl(uploadData.path)

    // 2. Enviar PDF a Claude para extracción
    const base64PDF = Buffer.from(fileBuffer).toString('base64')

    const extractionResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64PDF },
          },
          {
            type: 'text',
            text: `Eres un experto en seguros de empresa español. Analiza este documento de póliza de seguros y extrae todos los datos relevantes.

INSTRUCCIONES:
1. Detecta el ramo: danos, rc_general, rc_do, cyber, transporte, credito, u otro
2. Detecta el tipo de documento: nueva, renovacion, suplemento, actualizacion_capitales, otro
3. Extrae todos los campos que puedas encontrar
4. Para el ramo "danos", extrae las situaciones de riesgo (ubicaciones) con sus capitales y garantías
5. Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown

Estructura del JSON:
{
  "ramo": "danos|rc_general|rc_do|cyber|transporte|credito|otro",
  "tipo_documento": "nueva|renovacion|suplemento|actualizacion_capitales|otro",
  "tomador": "string",
  "aseguradora": "string",
  "numero_poliza": "string",
  "vigencia_desde": "YYYY-MM-DD o null",
  "vencimiento": "YYYY-MM-DD o null",
  "prima_neta": number o null,
  "impuestos": number o null,
  "otros_recargos": number o null,
  "prima_total": number o null,
  "asegurados_adicionales": ["string"] o [],
  "resumen_cambios": "Breve resumen de los cambios principales de este documento",
  "datos_ramo": {
    // campos específicos del ramo detectado
    // Para DAÑOS incluir "situaciones" como array con cada ubicación
  }
}

Para el ramo DAÑOS, dentro de datos_ramo incluye:
"situaciones": [
  {
    "referencia": "string",
    "asegurado_situacion": "string",
    "direccion": "string",
    "descripcion_actividad": "string",
    "construccion_estructura": "string",
    "construccion_cubierta": "string",
    "construccion_cerramientos": "string",
    "inflamables": "string",
    "pci": "string",
    "seguridad_antirrobo": "string",
    "capitales": [{"bien": "string", "capital": number, "modalidad": "string"}],
    "garantias": {"nombre_garantia": "valor o null"}
  }
]

Extrae todos los datos que encuentres. Si un campo no aparece en el documento, usa null.`
          }
        ]
      }]
    })

    const responseText = extractionResponse.content[0].type === 'text'
      ? extractionResponse.content[0].text : ''

    let extracted: any = {}
    try {
      const clean = responseText.replace(/```json\n?|\n?```/g, '').trim()
      extracted = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Error al interpretar la respuesta de Claude' }, { status: 500 })
    }

    // 3. Obtener o crear la póliza para este ramo
    const ramo = extracted.ramo || 'otro'

    let { data: poliza } = await supabase
      .from('polizas')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('ramo', ramo)
      .single()

    if (!poliza) {
      const { data: newPoliza } = await supabase
        .from('polizas')
        .insert({ cliente_id: clienteId, ramo, estado: 'vigente' })
        .select()
        .single()
      poliza = newPoliza
    } else {
      // Actualizar estado a vigente si era no_contratada
      await supabase
        .from('polizas')
        .update({ estado: 'vigente' })
        .eq('id', poliza.id)
    }

    if (!poliza) {
      return NextResponse.json({ error: 'Error al crear póliza' }, { status: 500 })
    }

    // 4. Crear la versión de póliza (sin validar aún)
    const { situaciones, ...datosRamoSinSituaciones } = extracted.datos_ramo || {}

    const { data: version, error: versionError } = await supabase
      .from('versiones_poliza')
      .insert({
        poliza_id: poliza.id,
        tipo_documento: extracted.tipo_documento || 'nueva',
        tomador: extracted.tomador,
        aseguradora: extracted.aseguradora,
        numero_poliza: extracted.numero_poliza,
        vigencia_desde: extracted.vigencia_desde,
        vencimiento: extracted.vencimiento,
        prima_neta: extracted.prima_neta,
        impuestos: extracted.impuestos,
        otros_recargos: extracted.otros_recargos,
        prima_total: extracted.prima_total,
        datos_ramo: {
          ...datosRamoSinSituaciones,
          asegurados_adicionales: extracted.asegurados_adicionales || [],
        },
        pdf_url: publicUrl,
        resumen_cambios: extracted.resumen_cambios,
        validada: false,
      })
      .select()
      .single()

    if (versionError || !version) {
      return NextResponse.json({ error: 'Error al guardar versión: ' + versionError?.message }, { status: 500 })
    }

    // 5. Si es Daños, guardar situaciones y capitales
    if (ramo === 'danos' && situaciones?.length) {
      for (let i = 0; i < situaciones.length; i++) {
        const sit = situaciones[i]
        const { data: situacion } = await supabase
          .from('situaciones_riesgo')
          .insert({
            version_poliza_id: version.id,
            orden: i + 1,
            referencia: sit.referencia,
            asegurado_situacion: sit.asegurado_situacion,
            direccion: sit.direccion,
            descripcion_actividad: sit.descripcion_actividad,
            construccion_estructura: sit.construccion_estructura,
            construccion_cubierta: sit.construccion_cubierta,
            construccion_cerramientos: sit.construccion_cerramientos,
            inflamables: sit.inflamables,
            pci: sit.pci,
            seguridad_antirrobo: sit.seguridad_antirrobo,
          })
          .select()
          .single()

        if (situacion && sit.capitales?.length) {
          await supabase.from('capitales').insert(
            sit.capitales.map((c: any, j: number) => ({
              situacion_id: situacion.id,
              bien: c.bien,
              capital: c.capital,
              modalidad: c.modalidad,
              orden: j + 1,
            }))
          )
        }
      }
    }

    return NextResponse.json({ version_id: version.id, ramo, cliente_id: clienteId })

  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
