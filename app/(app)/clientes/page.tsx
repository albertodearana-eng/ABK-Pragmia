import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import { ESTADO_LABELS } from '@/types'
import { clsx } from 'clsx'

export default async function ClientesPage() {
  const supabase = await createClient()

  const { data: clientes } = await supabase
    .from('clientes')
    .select(`
      *,
      razones_sociales(*),
      polizas(id, ramo, estado, versiones_poliza(prima_total, vencimiento, created_at))
    `)
    .order('nombre_cliente')

  const totalPrimaCliente = (polizas: any[]) => {
    return polizas?.reduce((sum, p) => {
      const ultima = p.versiones_poliza?.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0]
      return sum + (ultima?.prima_total || 0)
    }, 0) || 0
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {clientes?.length || 0} cliente{clientes?.length !== 1 ? 's' : ''} en cartera
          </p>
        </div>
        <Link href="/clientes/nuevo" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo cliente
        </Link>
      </div>

      {/* Empty state */}
      {!clientes?.length && (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-abk-red-light rounded-xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-abk-red" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-1">Sin clientes todavía</h3>
          <p className="text-sm text-gray-500 mb-4">
            Añade tu primer cliente para empezar a gestionar sus pólizas.
          </p>
          <Link href="/clientes/nuevo" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Añadir cliente
          </Link>
        </div>
      )}

      {/* Client grid */}
      {clientes && clientes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clientes.map(cliente => {
            const polizasVigentes = cliente.polizas?.filter((p: any) => p.estado === 'vigente') || []
            const totalPrima = totalPrimaCliente(cliente.polizas || [])
            const razonPrincipal = cliente.razones_sociales?.find((r: any) => r.es_principal)
              || cliente.razones_sociales?.[0]

            return (
              <Link key={cliente.id} href={`/clientes/${cliente.id}`} className="card p-4 hover:shadow-md transition-shadow block">
                {/* Status dot + name */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={clsx(
                      'w-2 h-2 rounded-full flex-shrink-0 mt-1',
                      cliente.estado === 'activo' ? 'bg-green-400' :
                      cliente.estado === 'en_proceso' ? 'bg-amber-400' : 'bg-gray-300'
                    )} />
                    <h2 className="font-semibold text-gray-900 truncate">{cliente.nombre_cliente}</h2>
                  </div>
                </div>

                {/* Razon social + sector */}
                {razonPrincipal && (
                  <p className="text-xs text-gray-500 mb-1 truncate">{razonPrincipal.cif}</p>
                )}
                {cliente.sector && (
                  <p className="text-xs text-gray-400 mb-3 truncate">{cliente.sector}</p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Pólizas vigentes</p>
                    <p className="text-sm font-semibold text-gray-800">{polizasVigentes.length}</p>
                  </div>
                  {totalPrima > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Prima total</p>
                      <p className="text-sm font-semibold text-abk-red">
                        {totalPrima.toLocaleString('es-ES', { minimumFractionDigits: 0 })} €
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
