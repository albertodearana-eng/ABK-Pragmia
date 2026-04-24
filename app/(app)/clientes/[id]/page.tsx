import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Edit, AlertTriangle, ChevronRight } from 'lucide-react'
import { RAMO_LABELS, RAMO_ORDEN, type Ramo } from '@/types'
import { clsx } from 'clsx'

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select(`
      *,
      razones_sociales(*),
      polizas(
        *,
        versiones_poliza(
          id, tipo_documento, aseguradora, numero_poliza,
          vigencia_desde, vencimiento, prima_total, validada, created_at
        )
      ),
      alertas(*)
    `)
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  // Ordenar pólizas según RAMO_ORDEN
  const polizasPorRamo = RAMO_ORDEN.reduce((acc, ramo) => {
    acc[ramo] = cliente.polizas?.find((p: any) => p.ramo === ramo)
    return acc
  }, {} as Record<string, any>)

  // Versión vigente de cada póliza (la más reciente validada)
  const versionVigente = (poliza: any) => {
    if (!poliza?.versiones_poliza?.length) return null
    return poliza.versiones_poliza
      .filter((v: any) => v.validada)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      || poliza.versiones_poliza.sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  const totalPrimas = RAMO_ORDEN.reduce((sum, ramo) => {
    const v = versionVigente(polizasPorRamo[ramo])
    return sum + (v?.prima_total || 0)
  }, 0)

  const alertasPendientes = cliente.alertas?.filter((a: any) => a.estado === 'pendiente') || []
  const razonPrincipal = cliente.razones_sociales?.find((r: any) => r.es_principal) || cliente.razones_sociales?.[0]

  const diasParaVencimiento = (fecha: string) => {
    const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
    return dias
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href="/clientes" className="btn-ghost p-2 -ml-2 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre_cliente}</h1>
            {razonPrincipal && (
              <p className="text-sm text-gray-500 mt-0.5">
                {razonPrincipal.razon_social} · {razonPrincipal.cif}
              </p>
            )}
            {cliente.sector && <p className="text-xs text-gray-400 mt-0.5">{cliente.sector}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clientes/${id}/editar`} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit className="w-3.5 h-3.5" />
            Editar
          </Link>
          <Link href={`/clientes/${id}/subir`} className="btn-primary flex items-center gap-2 text-sm">
            <Upload className="w-3.5 h-3.5" />
            Subir póliza
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT: datos cliente + alertas */}
        <div className="space-y-4">

          {/* Datos principales (nivel 1) */}
          <div className="card">
            <div className="section-header rounded-t-xl">Datos del cliente</div>
            <div className="p-4 space-y-3">
              {cliente.persona_contacto && (
                <div>
                  <p className="text-xs text-gray-400">Contacto</p>
                  <p className="text-sm font-medium">{cliente.persona_contacto}</p>
                </div>
              )}
              {cliente.email_contacto && (
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm">{cliente.email_contacto}</p>
                </div>
              )}
              {cliente.telefono_contacto && (
                <div>
                  <p className="text-xs text-gray-400">Teléfono</p>
                  <p className="text-sm">{cliente.telefono_contacto}</p>
                </div>
              )}
              {cliente.descripcion_actividad && (
                <div>
                  <p className="text-xs text-gray-400">Actividad</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{cliente.descripcion_actividad}</p>
                </div>
              )}
              {/* Razones sociales adicionales */}
              {cliente.razones_sociales?.length > 1 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Razones sociales</p>
                  <div className="space-y-1">
                    {cliente.razones_sociales.map((r: any) => (
                      <div key={r.id} className="text-xs text-gray-600">
                        {r.razon_social} — <span className="text-gray-400">{r.cif}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(cliente.facturacion_anual || cliente.num_empleados) && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  {cliente.facturacion_anual && (
                    <div>
                      <p className="text-xs text-gray-400">Facturación</p>
                      <p className="text-sm font-medium">
                        {(cliente.facturacion_anual / 1000000).toFixed(1)}M €
                      </p>
                    </div>
                  )}
                  {cliente.num_empleados && (
                    <div>
                      <p className="text-xs text-gray-400">Empleados</p>
                      <p className="text-sm font-medium">{cliente.num_empleados}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Alertas */}
          {alertasPendientes.length > 0 && (
            <div className="card">
              <div className="px-4 py-2.5 bg-amber-600 text-white rounded-t-xl font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Alertas ({alertasPendientes.length})
              </div>
              <div className="divide-y divide-gray-100">
                {alertasPendientes.map((alerta: any) => {
                  const dias = alerta.fecha_limite ? diasParaVencimiento(alerta.fecha_limite) : null
                  return (
                    <div key={alerta.id} className="p-3">
                      <p className="text-xs font-medium text-gray-800">{alerta.titulo}</p>
                      {alerta.accion && <p className="text-xs text-gray-500 mt-0.5">{alerta.accion}</p>}
                      {dias !== null && (
                        <p className={clsx(
                          'text-xs font-medium mt-1',
                          dias <= 30 ? 'text-red-600' : dias <= 60 ? 'text-amber-600' : 'text-gray-500'
                        )}>
                          {dias < 0 ? `Vencida hace ${Math.abs(dias)} días` :
                           dias === 0 ? 'Vence hoy' : `${dias} días`}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Nota interna */}
          {cliente.notas_internas && (
            <div className="card p-4">
              <p className="text-xs text-gray-400 mb-1">Notas internas</p>
              <p className="text-sm text-gray-700">{cliente.notas_internas}</p>
            </div>
          )}
        </div>

        {/* RIGHT: resumen pólizas */}
        <div className="lg:col-span-2 space-y-4">
          {/* Total primas */}
          {totalPrimas > 0 && (
            <div className="card p-4 flex items-center justify-between bg-abk-red-light border-abk-red-light">
              <div>
                <p className="text-xs text-abk-red font-medium">Prima total programa</p>
                <p className="text-2xl font-bold text-abk-red">
                  {totalPrimas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-abk-red">Pólizas vigentes</p>
                <p className="text-2xl font-bold text-abk-red">
                  {RAMO_ORDEN.filter(r => polizasPorRamo[r]?.estado === 'vigente').length}
                </p>
              </div>
            </div>
          )}

          {/* Tabla de pólizas */}
          <div className="card overflow-hidden">
            <div className="section-header rounded-t-xl">Programa de seguros</div>
            <div className="divide-y divide-gray-100">
              {RAMO_ORDEN.map(ramo => {
                const poliza = polizasPorRamo[ramo]
                const version = versionVigente(poliza)
                const noContratada = !poliza || poliza.estado === 'no_contratada'
                const dias = version?.vencimiento ? diasParaVencimiento(version.vencimiento) : null

                return (
                  <Link
                    key={ramo}
                    href={`/clientes/${id}/${ramo}`}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status indicator */}
                      <div className={clsx(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        noContratada ? 'bg-gray-200' :
                        poliza?.estado === 'vigente' ? 'bg-green-400' :
                        poliza?.estado === 'en_renovacion' ? 'bg-amber-400' : 'bg-red-400'
                      )} />
                      <div>
                        <p className={clsx(
                          'text-sm font-medium',
                          noContratada ? 'text-gray-400' : 'text-gray-800'
                        )}>
                          {RAMO_LABELS[ramo as Ramo]}
                        </p>
                        {version && (
                          <p className="text-xs text-gray-400">
                            {version.aseguradora} · {version.numero_poliza}
                          </p>
                        )}
                        {noContratada && (
                          <p className="text-xs text-amber-600">💡 No contratada — ¿Valorar?</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {version?.vencimiento && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">Vencimiento</p>
                          <p className={clsx(
                            'text-xs font-medium',
                            dias !== null && dias <= 90 ? 'text-amber-600' : 'text-gray-600'
                          )}>
                            {new Date(version.vencimiento).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      )}
                      {version?.prima_total && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Prima</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {version.prima_total.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
                          </p>
                        </div>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
