import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ValidationForm from './ValidationForm'
import { RAMO_LABELS, type Ramo } from '@/types'

export default async function ValidarPage({
  params
}: {
  params: Promise<{ id: string; version_id: string }>
}) {
  const { id, version_id } = await params
  const supabase = await createClient()

  const { data: version } = await supabase
    .from('versiones_poliza')
    .select(`
      *,
      polizas(ramo, cliente_id),
      situaciones_riesgo(*, capitales(*))
    `)
    .eq('id', version_id)
    .single()

  if (!version) notFound()
  if (version.polizas?.cliente_id !== id) notFound()

  const ramo = version.polizas?.ramo as Ramo

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Nuevo documento</span>
          <span>→</span>
          <span className="text-abk-red font-medium">{RAMO_LABELS[ramo]}</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Revisar datos extraídos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Claude ha extraído los datos del PDF. Revisa, corrige si es necesario y confirma para guardar.
        </p>
      </div>

      <ValidationForm
        version={version}
        ramo={ramo}
        clienteId={id}
      />
    </div>
  )
}
