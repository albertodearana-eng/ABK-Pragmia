'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { RAMO_LABELS, type Ramo } from '@/types'
import { clsx } from 'clsx'

interface Props {
  version: any
  ramo: Ramo
  clienteId: string
}

export default function ValidationForm({ version, ramo, clienteId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  // Editable fields
  const [fields, setFields] = useState({
    tomador: version.tomador || '',
    aseguradora: version.aseguradora || '',
    numero_poliza: version.numero_poliza || '',
    vigencia_desde: version.vigencia_desde || '',
    vencimiento: version.vencimiento || '',
    prima_neta: version.prima_neta?.toString() || '',
    impuestos: version.impuestos?.toString() || '',
    otros_recargos: version.otros_recargos?.toString() || '',
    prima_total: version.prima_total?.toString() || '',
    tipo_documento: version.tipo_documento || 'nueva',
    notas_corredor: version.notas_corredor || '',
  })

  const update = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }))

  const handleConfirm = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('versiones_poliza')
      .update({
        tomador: fields.tomador || null,
        aseguradora: fields.aseguradora || null,
        numero_poliza: fields.numero_poliza || null,
        vigencia_desde: fields.vigencia_desde || null,
        vencimiento: fields.vencimiento || null,
        prima_neta: fields.prima_neta ? parseFloat(fields.prima_neta) : null,
        impuestos: fields.impuestos ? parseFloat(fields.impuestos) : null,
        otros_recargos: fields.otros_recargos ? parseFloat(fields.otros_recargos) : null,
        prima_total: fields.prima_total ? parseFloat(fields.prima_total) : null,
        tipo_documento: fields.tipo_documento,
        notas_corredor: fields.notas_corredor || null,
        validada: true,
        validada_at: new Date().toISOString(),
      })
      .eq('id', version.id)

    if (!error) {
      // Update poliza estado
      await supabase
        .from('polizas')
        .update({ estado: 'vigente' })
        .eq('id', version.polizas?.id || version.poliza_id)

      router.push(`/clientes/${clienteId}/${ramo}`)
    } else {
      alert('Error al guardar: ' + error.message)
      setSaving(false)
    }
  }

  const Field = ({ label, fieldKey, type = 'text', hint }: { label: string; fieldKey: string; type?: string; hint?: string }) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input"
        value={(fields as any)[fieldKey]}
        onChange={e => update(fieldKey, e.target.value)}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Detection banner */}
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            Ramo detectado: {RAMO_LABELS[ramo]}
          </p>
          {version.resumen_cambios && (
            <p className="text-xs text-green-700 mt-0.5">{version.resumen_cambios}</p>
          )}
        </div>
      </div>

      {/* Datos comunes */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Identificación de la póliza
          <span className="ml-2 text-xs text-green-600 font-normal">✓ Extraído automáticamente — revisa y corrige si es necesario</span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Tipo de documento</label>
            <select
              className="input"
              value={fields.tipo_documento}
              onChange={e => update('tipo_documento', e.target.value)}
            >
              <option value="nueva">Nueva póliza</option>
              <option value="renovacion">Renovación</option>
              <option value="suplemento">Suplemento</option>
              <option value="actualizacion_capitales">Actualización de capitales</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <Field label="Tomador del seguro" fieldKey="tomador" />
          <Field label="Aseguradora" fieldKey="aseguradora" />
          <Field label="Nº de póliza" fieldKey="numero_poliza" />
          <div /> {/* spacer */}
          <Field label="Vigencia desde" fieldKey="vigencia_desde" type="date" />
          <Field label="Vencimiento" fieldKey="vencimiento" type="date" />
          <Field label="Prima neta (€)" fieldKey="prima_neta" type="number" />
          <Field label="Impuestos / Consorci / Recargos (€)" fieldKey="impuestos" type="number" />
          <Field label="Otros recargos (€)" fieldKey="otros_recargos" type="number" />
          <Field
            label="Prima total (€)"
            fieldKey="prima_total"
            type="number"
            hint="Suma de prima neta + impuestos + recargos"
          />
        </div>
      </div>

      {/* Situaciones (solo Daños) */}
      {ramo === 'danos' && version.situaciones_riesgo?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            Situaciones de riesgo ({version.situaciones_riesgo.length})
          </h2>
          <div className="space-y-4">
            {version.situaciones_riesgo
              .sort((a: any, b: any) => a.orden - b.orden)
              .map((sit: any, i: number) => (
              <div key={sit.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-abk-red text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="font-medium text-sm text-gray-800">
                    {sit.referencia || `Situación ${i + 1}`}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  {sit.direccion && (
                    <div>
                      <span className="text-gray-400">Dirección: </span>
                      <span className="text-gray-700">{sit.direccion}</span>
                    </div>
                  )}
                  {sit.asegurado_situacion && (
                    <div>
                      <span className="text-gray-400">Asegurado: </span>
                      <span className="text-gray-700">{sit.asegurado_situacion}</span>
                    </div>
                  )}
                  {sit.descripcion_actividad && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-400">Actividad: </span>
                      <span className="text-gray-700">{sit.descripcion_actividad}</span>
                    </div>
                  )}
                </div>
                {sit.capitales?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">Capitales asegurados</p>
                    <div className="space-y-1">
                      {sit.capitales.map((c: any) => (
                        <div key={c.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">{c.bien}</span>
                          <span className="font-medium text-gray-800">
                            {c.capital ? c.capital.toLocaleString('es-ES') + ' €' : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Las situaciones y capitales se pueden editar en detalle desde la pantalla del ramo.
          </p>
        </div>
      )}

      {/* Datos específicos del ramo */}
      {version.datos_ramo && Object.keys(version.datos_ramo).length > 0 && (
        <div className="card p-5">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="font-semibold text-gray-800">
              Datos específicos — {RAMO_LABELS[ramo]}
            </h2>
            {showRaw ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showRaw && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-3">
                Estos datos se pueden editar en detalle desde la pantalla del ramo. Aquí se muestran tal como los ha extraído Claude.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(version.datos_ramo)
                  .filter(([k, v]) => v !== null && v !== undefined && k !== 'situaciones' && !Array.isArray(v) && typeof v !== 'object')
                  .map(([key, value]) => (
                  <div key={key} className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-400">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-700 font-medium">{String(value)}</p>
                  </div>
                ))}
              </div>
              {version.datos_ramo.asegurados_adicionales?.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-400">Asegurados adicionales</p>
                  <p className="text-sm text-gray-700">{version.datos_ramo.asegurados_adicionales.join(' · ')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notas del corredor */}
      <div className="card p-5">
        <label className="label">Notas del corredor <span className="text-gray-400 font-normal">(no se exportan al cliente)</span></label>
        <textarea
          className="input h-24 resize-none"
          value={fields.notas_corredor}
          onChange={e => update('notas_corredor', e.target.value)}
          placeholder="Observaciones, gaps detectados, acciones pendientes..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => router.push(`/clientes/${clienteId}`)}
          className="btn-ghost"
        >
          Descartar
        </button>
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Confirmar y guardar'}
        </button>
      </div>
    </div>
  )
}
