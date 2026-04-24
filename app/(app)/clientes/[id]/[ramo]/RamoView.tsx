'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, ExternalLink } from 'lucide-react'
import { type Ramo } from '@/types'
import { clsx } from 'clsx'

interface Props {
  version: any
  ramo: Ramo
  clienteId: string
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{title}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>
      {open && <div className="p-4 pt-0 bg-white border-t border-gray-100">{children}</div>}
    </div>
  )
}

function FieldRow({ label, value, highlight }: { label: string; value?: string | number | null; highlight?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className={clsx('flex justify-between items-start py-2 border-b border-gray-50 last:border-0', highlight && 'bg-abk-red-light -mx-4 px-4 rounded')}>
      <span className="text-sm text-gray-500 flex-shrink-0 mr-4">{label}</span>
      <span className={clsx('text-sm font-medium text-right', highlight ? 'text-abk-red' : 'text-gray-800')}>
        {typeof value === 'number' ? value.toLocaleString('es-ES') + ' €' : value}
      </span>
    </div>
  )
}

function EuroField({ label, value, highlight }: { label: string; value?: number | null; highlight?: boolean }) {
  if (!value && value !== 0) return null
  return <FieldRow label={label} value={value} highlight={highlight} />
}

export default function RamoView({ version, ramo, clienteId }: Props) {
  const d = version.datos_ramo || {}

  return (
    <div className="space-y-4">

      {/* ── NIVEL 1: Identificación siempre visible ── */}
      <div className="card overflow-hidden">
        <div className="section-header rounded-t-xl flex items-center justify-between">
          <span>Identificación de la póliza</span>
          {!version.validada && (
            <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-medium">
              Pendiente de validar
            </span>
          )}
        </div>
        <div className="p-4 grid sm:grid-cols-2 gap-x-8">
          <div>
            <FieldRow label="Tomador" value={version.tomador} />
            {d.asegurados_adicionales?.length > 0 && (
              <FieldRow label="Asegurados adicionales" value={d.asegurados_adicionales.join(' · ')} />
            )}
            <FieldRow label="Aseguradora" value={version.aseguradora} />
            <FieldRow label="Nº póliza" value={version.numero_poliza} />
          </div>
          <div>
            <FieldRow
              label="Vigencia"
              value={version.vigencia_desde
                ? new Date(version.vigencia_desde).toLocaleDateString('es-ES') + ' → ' +
                  (version.vencimiento ? new Date(version.vencimiento).toLocaleDateString('es-ES') : '—')
                : null}
            />
            <EuroField label="Prima total" value={version.prima_total} highlight />
          </div>
        </div>

        {/* Nivel 1 específico por ramo */}
        {ramo === 'danos' && (
          <div className="px-4 pb-4">
            <FieldRow label="Franquicia general" value={d.franquicia_general} />
            <FieldRow label="Límite conjunto indemnización" value={d.limite_conjunto} />
          </div>
        )}
        {ramo === 'rc_general' && (
          <div className="px-4 pb-4">
            <FieldRow label="Actividad asegurada" value={d.actividad_asegurada} />
            <EuroField label="Límite general" value={d.limite_general} highlight />
            <FieldRow label="Ámbito territorial" value={d.ambito_territorial} />
          </div>
        )}
        {(ramo === 'rc_do' || ramo === 'cyber') && (
          <div className="px-4 pb-4">
            <EuroField label="Límite agregado" value={d.limite_agregado} highlight />
            {ramo === 'rc_do' && d.filiales_cubiertas?.length > 0 && (
              <FieldRow label="Filiales cubiertas" value={d.filiales_cubiertas.join(' · ')} />
            )}
            {ramo === 'cyber' && d.requisitos_seguridad?.length > 0 && (
              <FieldRow label="Requisitos de seguridad" value={d.requisitos_seguridad.join(' · ')} />
            )}
          </div>
        )}
        {ramo === 'transporte' && (
          <div className="px-4 pb-4">
            <FieldRow label="Modalidad" value={d.modalidad} />
            <EuroField label="Capital máximo por envío" value={d.capital_por_envio} highlight />
          </div>
        )}
        {ramo === 'credito' && (
          <div className="px-4 pb-4">
            <FieldRow label="Modalidad" value={d.modalidad} />
            <EuroField label="Límite global de crédito" value={d.limite_global} highlight />
            <FieldRow label="% de indemnización" value={d.porcentaje_indemnizacion ? d.porcentaje_indemnizacion + '%' : null} />
          </div>
        )}

        {/* Ver detalle toggle */}
        <DetailSection title="▾ Ver detalle completo de la póliza">
          <div className="grid sm:grid-cols-2 gap-x-8 pt-2">
            <div>
              <EuroField label="Prima neta" value={version.prima_neta} />
              <EuroField label="Impuestos / Consorci" value={version.impuestos} />
              <EuroField label="Otros recargos" value={version.otros_recargos} />
              {ramo === 'rc_general' && (
                <>
                  <EuroField label="Facturación declarada" value={d.facturacion_declarada} />
                  {d.tasa_prima && <FieldRow label="Tasa prima" value={(d.tasa_prima * 1000).toFixed(4) + '‰ (' + d.tasa_origen + ')'} />}
                  <FieldRow label="Delimitación temporal" value={d.delimitacion_temporal} />
                </>
              )}
            </div>
            <div>
              {ramo === 'rc_general' && (
                <>
                  <EuroField label="Sublímite RC Patronal/víctima" value={d.sublimite_patronal_victima} />
                  <EuroField label="Sublímite bienes en poder" value={d.sublimite_bienes_poder} />
                  <EuroField label="Sublímite vehículos terceros" value={d.sublimite_vehiculos_terceros} />
                  <EuroField label="Franquicia general" value={d.franquicia_general} />
                  <EuroField label="Franquicia productos/trabajos" value={d.franquicia_productos} />
                </>
              )}
              {ramo === 'rc_do' && (
                <>
                  <FieldRow label="Side A (personas físicas)" value={d.side_a ? '✅ Incluida' : '❌ No incluida'} />
                  <FieldRow label="Side B (reembolso empresa)" value={d.side_b ? '✅ Incluida' : '❌ No incluida'} />
                  <FieldRow label="Side C / Entidad" value={d.side_c ? '✅ Incluida' : '❌ No incluida'} />
                  <FieldRow label="Defensa laboral (EPL)" value={d.epl ? '✅ Incluida' : '❌ No incluida'} />
                  <FieldRow label="Retroactividad" value={d.retroactividad} />
                  <FieldRow label="Período de cola" value={d.periodo_cola} />
                </>
              )}
              {ramo === 'cyber' && (
                <>
                  <FieldRow label="Respuesta incidente" value={d.respuesta_incidente === true ? '✅' : d.respuesta_incidente ? d.respuesta_incidente + ' €' : '❌'} />
                  <FieldRow label="Ransomware / Extorsión" value={d.extorsion_ransomware === true ? '✅' : d.extorsion_ransomware ? d.extorsion_ransomware + ' €' : '❌'} />
                  <FieldRow label="BI Cyber" value={d.bi_cyber === true ? '✅' : d.bi_cyber ? d.bi_cyber + ' €' : '❌'} />
                  <FieldRow label="RC brecha de datos" value={d.rc_brecha_datos === true ? '✅' : d.rc_brecha_datos ? d.rc_brecha_datos + ' €' : '❌'} />
                  <FieldRow label="Defensa GDPR" value={d.defensa_gdpr === true ? '✅' : d.defensa_gdpr ? d.defensa_gdpr + ' €' : '❌'} />
                </>
              )}
            </div>
          </div>
          {d.exclusiones && (
            <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-1">Exclusiones relevantes</p>
              <p className="text-xs text-red-600">{d.exclusiones}</p>
            </div>
          )}
        </DetailSection>
      </div>

      {/* ── DAÑOS: Situaciones de riesgo ── */}
      {ramo === 'danos' && version.situaciones_riesgo?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800">Situaciones de riesgo</h2>
          {version.situaciones_riesgo
            .sort((a: any, b: any) => a.orden - b.orden)
            .map((sit: any, i: number) => {
              const totalCapital = sit.capitales?.reduce((s: number, c: any) => s + (c.capital || 0), 0)
              return (
                <div key={sit.id} className="card overflow-hidden">
                  {/* Nivel 1 situación */}
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 bg-abk-red text-white rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="font-semibold text-gray-800">
                        {sit.nombre_personalizado || sit.referencia || `Situación ${i + 1}`}
                      </p>
                    </div>
                    {sit.asegurado_situacion && (
                      <p className="text-xs text-gray-500 ml-8">{sit.asegurado_situacion}</p>
                    )}
                    {sit.direccion && (
                      <p className="text-xs text-gray-500 ml-8">{sit.direccion}</p>
                    )}
                    {sit.descripcion_actividad && (
                      <p className="text-xs text-gray-600 ml-8 mt-1 leading-relaxed">{sit.descripcion_actividad}</p>
                    )}
                  </div>

                  {/* Capitales — siempre visible */}
                  <div className="p-4">
                    {sit.capitales?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">Capitales asegurados</p>
                        <div className="space-y-1.5">
                          {sit.capitales
                            .sort((a: any, b: any) => a.orden - b.orden)
                            .map((c: any) => (
                            <div key={c.id} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">{c.bien}</span>
                              <div className="text-right">
                                <span className="font-semibold text-gray-800">
                                  {c.capital ? c.capital.toLocaleString('es-ES') + ' €' : '—'}
                                </span>
                                {c.modalidad && (
                                  <span className="text-xs text-gray-400 ml-1">({c.modalidad})</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {totalCapital > 0 && (
                            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-gray-200 text-abk-red">
                              <span>Total</span>
                              <span>{totalCapital.toLocaleString('es-ES')} €</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* PdB si contratada */}
                    {d.pdb_contratada && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                        <p className="text-xs font-semibold text-blue-800 mb-1">Pérdida de Beneficios</p>
                        <div className="flex gap-4 text-xs text-blue-700">
                          {d.pdb_capital && <span>Capital: <strong>{d.pdb_capital.toLocaleString('es-ES')} €</strong></span>}
                          {d.pdb_periodo_meses && <span>Período: <strong>{d.pdb_periodo_meses} meses</strong></span>}
                        </div>
                      </div>
                    )}

                    {/* Detalle situación desplegable */}
                    <DetailSection title="▾ Ver detalle construcción, PCI y garantías">
                      <div className="space-y-2 pt-2">
                        {sit.construccion_estructura && <FieldRow label="Estructura" value={sit.construccion_estructura} />}
                        {sit.construccion_cubierta && <FieldRow label="Cubierta" value={sit.construccion_cubierta} />}
                        {sit.construccion_cerramientos && <FieldRow label="Cerramientos" value={sit.construccion_cerramientos} />}
                        {sit.inflamables && <FieldRow label="Inflamables" value={sit.inflamables} />}
                        {sit.pci && <FieldRow label="PCI" value={sit.pci} />}
                        {sit.seguridad_antirrobo && <FieldRow label="Seguridad" value={sit.seguridad_antirrobo} />}
                        {sit.notas && (
                          <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                            <p className="text-xs text-amber-700">{sit.notas}</p>
                          </div>
                        )}
                      </div>
                    </DetailSection>
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Notas del corredor y PDF */}
      <div className="grid sm:grid-cols-2 gap-4">
        {version.notas_corredor && (
          <div className="card p-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Notas del corredor</p>
            <p className="text-sm text-gray-700 leading-relaxed">{version.notas_corredor}</p>
          </div>
        )}
        {version.pdf_url && (
          <div className="card p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-abk-red flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">PDF original</p>
              <p className="text-xs text-gray-400">Documento fuente de esta versión</p>
            </div>
            <a
              href={version.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              Ver
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
