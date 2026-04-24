'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface RazonSocialForm {
  razon_social: string
  cif: string
  direccion_fiscal: string
  es_principal: boolean
}

export default function NuevoClientePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre_cliente: '',
    sector: '',
    descripcion_actividad: '',
    persona_contacto: '',
    email_contacto: '',
    telefono_contacto: '',
    facturacion_anual: '',
    num_empleados: '',
    notas_internas: '',
    proxima_accion: '',
    proxima_accion_fecha: '',
  })

  const [razones, setRazones] = useState<RazonSocialForm[]>([
    { razon_social: '', cif: '', direccion_fiscal: '', es_principal: true }
  ])

  const addRazon = () => {
    setRazones([...razones, { razon_social: '', cif: '', direccion_fiscal: '', es_principal: false }])
  }

  const removeRazon = (i: number) => {
    const next = razones.filter((_, idx) => idx !== i)
    if (next.length > 0 && !next.some(r => r.es_principal)) next[0].es_principal = true
    setRazones(next)
  }

  const updateRazon = (i: number, field: keyof RazonSocialForm, value: string | boolean) => {
    const next = razones.map((r, idx) => {
      if (idx === i) return { ...r, [field]: value }
      if (field === 'es_principal' && value === true) return { ...r, es_principal: false }
      return r
    })
    setRazones(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('No autenticado'); setLoading(false); return }

    // Crear cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .insert({
        nombre_cliente: form.nombre_cliente,
        sector: form.sector || null,
        descripcion_actividad: form.descripcion_actividad || null,
        persona_contacto: form.persona_contacto || null,
        email_contacto: form.email_contacto || null,
        telefono_contacto: form.telefono_contacto || null,
        facturacion_anual: form.facturacion_anual ? parseFloat(form.facturacion_anual) : null,
        num_empleados: form.num_empleados ? parseInt(form.num_empleados) : null,
        notas_internas: form.notas_internas || null,
        proxima_accion: form.proxima_accion || null,
        proxima_accion_fecha: form.proxima_accion_fecha || null,
        corredor_id: user.id,
        estado: 'activo',
      })
      .select()
      .single()

    if (clienteError || !cliente) {
      setError('Error al crear el cliente: ' + clienteError?.message)
      setLoading(false)
      return
    }

    // Crear razones sociales
    const razonesValidas = razones.filter(r => r.razon_social && r.cif)
    if (razonesValidas.length > 0) {
      const { error: razonesError } = await supabase
        .from('razones_sociales')
        .insert(razonesValidas.map(r => ({ ...r, cliente_id: cliente.id })))

      if (razonesError) {
        setError('Cliente creado pero error en razones sociales: ' + razonesError.message)
        setLoading(false)
        return
      }
    }

    // Crear pólizas vacías para los 6 ramos
    const ramos = ['danos', 'rc_general', 'rc_do', 'cyber', 'transporte', 'credito']
    await supabase.from('polizas').insert(
      ramos.map(ramo => ({ cliente_id: cliente.id, ramo, estado: 'no_contratada' }))
    )

    router.push(`/clientes/${cliente.id}`)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clientes" className="btn-ghost p-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
          <p className="text-sm text-gray-500">Alta de cliente o grupo empresarial</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Datos principales */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            Datos del cliente / grupo
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nombre cliente / grupo *</label>
              <input
                className="input"
                value={form.nombre_cliente}
                onChange={e => setForm({ ...form, nombre_cliente: e.target.value })}
                placeholder="ej. Plating Group"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Nombre con el que identificáis el cliente internamente</p>
            </div>
            <div>
              <label className="label">Sector</label>
              <input
                className="input"
                value={form.sector}
                onChange={e => setForm({ ...form, sector: e.target.value })}
                placeholder="ej. Industria química / Automoción"
              />
            </div>
            <div>
              <label className="label">Persona de contacto</label>
              <input
                className="input"
                value={form.persona_contacto}
                onChange={e => setForm({ ...form, persona_contacto: e.target.value })}
                placeholder="Nombre y cargo"
              />
            </div>
            <div>
              <label className="label">Email de contacto</label>
              <input
                type="email"
                className="input"
                value={form.email_contacto}
                onChange={e => setForm({ ...form, email_contacto: e.target.value })}
                placeholder="contacto@empresa.com"
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                className="input"
                value={form.telefono_contacto}
                onChange={e => setForm({ ...form, telefono_contacto: e.target.value })}
                placeholder="+34 600 000 000"
              />
            </div>
            <div>
              <label className="label">Facturación anual (€) <span className="text-gray-400 font-normal">— opcional</span></label>
              <input
                type="number"
                className="input"
                value={form.facturacion_anual}
                onChange={e => setForm({ ...form, facturacion_anual: e.target.value })}
                placeholder="ej. 12400000"
              />
            </div>
            <div>
              <label className="label">Nº empleados <span className="text-gray-400 font-normal">— opcional</span></label>
              <input
                type="number"
                className="input"
                value={form.num_empleados}
                onChange={e => setForm({ ...form, num_empleados: e.target.value })}
                placeholder="ej. 85"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Descripción de actividad</label>
              <textarea
                className="input h-20 resize-none"
                value={form.descripcion_actividad}
                onChange={e => setForm({ ...form, descripcion_actividad: e.target.value })}
                placeholder="Descripción breve de la actividad principal de la empresa..."
              />
            </div>
          </div>
        </div>

        {/* Razones sociales */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Razones sociales / CIFs</h2>
            <button type="button" onClick={addRazon} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Añadir
            </button>
          </div>
          <div className="space-y-4">
            {razones.map((r, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="principal"
                      checked={r.es_principal}
                      onChange={() => updateRazon(i, 'es_principal', true)}
                      className="accent-abk-red"
                    />
                    <span className="text-xs font-medium text-gray-600">
                      {r.es_principal ? '★ Principal' : 'Secundaria'}
                    </span>
                  </label>
                  {razones.length > 1 && (
                    <button type="button" onClick={() => removeRazon(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label text-xs">Razón social *</label>
                    <input
                      className="input text-sm"
                      value={r.razon_social}
                      onChange={e => updateRazon(i, 'razon_social', e.target.value)}
                      placeholder="ej. PLATING BRAP, S.A."
                    />
                  </div>
                  <div>
                    <label className="label text-xs">CIF / NIF *</label>
                    <input
                      className="input text-sm"
                      value={r.cif}
                      onChange={e => updateRazon(i, 'cif', e.target.value)}
                      placeholder="ej. A63628549"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label text-xs">Dirección fiscal</label>
                    <input
                      className="input text-sm"
                      value={r.direccion_fiscal}
                      onChange={e => updateRazon(i, 'direccion_fiscal', e.target.value)}
                      placeholder="Calle, nº, CP, Municipio, Provincia"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notas internas */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
            Notas internas <span className="text-xs text-gray-400 font-normal">(no se exportan al cliente)</span>
          </h2>
          <div className="grid gap-4">
            <div>
              <label className="label">Notas</label>
              <textarea
                className="input h-20 resize-none"
                value={form.notas_internas}
                onChange={e => setForm({ ...form, notas_internas: e.target.value })}
                placeholder="Observaciones, contexto, pendientes..."
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Próxima acción</label>
                <input
                  className="input"
                  value={form.proxima_accion}
                  onChange={e => setForm({ ...form, proxima_accion: e.target.value })}
                  placeholder="ej. Llamar para renovación RC"
                />
              </div>
              <div>
                <label className="label">Fecha límite</label>
                <input
                  type="date"
                  className="input"
                  value={form.proxima_accion_fecha}
                  onChange={e => setForm({ ...form, proxima_accion_fecha: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/clientes" className="btn-ghost">Cancelar</Link>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  )
}
