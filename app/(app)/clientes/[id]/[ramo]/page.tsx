import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Clock } from 'lucide-react'
import { RAMO_LABELS, type Ramo } from '@/types'
import RamoView from './RamoView'

const VALID_RAMOS: Ramo[] = ['danos', 'rc_general', 'rc_do', 'cyber', 'transporte', 'credito']

export default async function RamoPage({
  params
}: {
  params: Promise<{ id: string; ramo: string }>
}) {
  const { id, ramo } = await params

  if (!VALID_RAMOS.includes(ramo as Ramo)) notFound()

  const supabase = await createClient()

  const { data: poliza } = await supabase
    .from('polizas')
    .select(`
      *,
      versiones_poliza(
        *,
        situaciones_riesgo(*, capitales(*))
      )
    `)
    .eq('cliente_id', id)
    .eq('ramo', ramo)
    .single()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('nombre_cliente')
    .eq('id', id)
    .single()

  if (!poliza) notFound()

  // Versiones ordenadas por fecha desc
  const versiones = (poliza.versiones_poliza || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const versionVigente = versiones.find((v: any) => v.validada) || versiones[0]

  const noContratada = poliza.estado === 'no_contratada'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href={`/clientes/${id}`} className="btn-ghost p-2 -ml-2 mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-sm text-gray-400">{cliente?.nombre_cliente}</p>
            <h1 className="text-xl font-bold text-gray-900">{RAMO_LABELS[ramo as Ramo]}</h1>
          </div>
        </div>
        <Link
          href={`/clientes/${id}/subir`}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          {noContratada ? 'Subir póliza' : 'Subir renovación / suplemento'}
        </Link>
      </div>

      {/* Not contracted state */}
      {noContratada && (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💡</span>
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">No contratada — ¿Valorar?</h3>
          <p className="text-sm text-gray-500 mb-1">Este ramo no está actualmente contratado.</p>
          {poliza.nota_comercial && (
            <p className="text-sm text-amber-700 bg-amber-50 px-4 py-2 rounded-lg mt-3 inline-block">
              {poliza.nota_comercial}
            </p>
          )}
          <div className="mt-6">
            <Link href={`/clientes/${id}/subir`} className="btn-primary">
              Subir primera póliza
            </Link>
          </div>
        </div>
      )}

      {/* Has policy */}
      {!noContratada && versionVigente && (
        <>
          {/* Version selector */}
          {versiones.length > 1 && (
            <div className="flex items-center gap-2 mb-5 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Versiones:</span>
              <div className="flex gap-2 flex-wrap">
                {versiones.map((v: any, i: number) => (
                  <span
                    key={v.id}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      i === 0
                        ? 'bg-abk-red text-white'
                        : 'bg-white border border-gray-300 text-gray-600'
                    }`}
                  >
                    {v.tipo_documento === 'renovacion' ? 'Renovación' :
                     v.tipo_documento === 'suplemento' ? 'Supl.' :
                     v.tipo_documento === 'nueva' ? 'Nueva' : v.tipo_documento}
                    {' '}
                    {new Date(v.created_at).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                    {!v.validada && ' ⏳'}
                  </span>
                ))}
              </div>
            </div>
          )}

          <RamoView version={versionVigente} ramo={ramo as Ramo} clienteId={id} />
        </>
      )}
    </div>
  )
}
