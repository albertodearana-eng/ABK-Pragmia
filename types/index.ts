export type Ramo = 'danos' | 'rc_general' | 'rc_do' | 'cyber' | 'transporte' | 'credito' | 'otro'
export type EstadoPoliza = 'vigente' | 'cancelada' | 'en_renovacion' | 'vencida' | 'no_contratada'
export type TipoDocumento = 'nueva' | 'renovacion' | 'suplemento' | 'actualizacion_capitales' | 'otro'
export type RolUsuario = 'admin' | 'corredor' | 'readonly'
export type EstadoCliente = 'activo' | 'en_proceso' | 'inactivo'
export type NivelRiesgo = 'bajo' | 'moderado' | 'alto' | 'extremo'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
  created_at: string
}

export interface Cliente {
  id: string
  nombre_cliente: string
  sector?: string
  descripcion_actividad?: string
  persona_contacto?: string
  email_contacto?: string
  telefono_contacto?: string
  facturacion_anual?: number
  num_empleados?: number
  logo_url?: string
  corredor_id: string
  estado: EstadoCliente
  notas_internas?: string
  proxima_accion?: string
  proxima_accion_fecha?: string
  created_at: string
  updated_at: string
  razones_sociales?: RazonSocial[]
  polizas?: Poliza[]
}

export interface RazonSocial {
  id: string
  cliente_id: string
  razon_social: string
  cif: string
  direccion_fiscal?: string
  es_principal: boolean
  created_at: string
}

export interface Poliza {
  id: string
  cliente_id: string
  ramo: Ramo
  estado: EstadoPoliza
  nota_comercial?: string
  created_at: string
  updated_at: string
  versiones?: VersionPoliza[]
  version_vigente?: VersionPoliza
}

export interface VersionPoliza {
  id: string
  poliza_id: string
  tipo_documento: TipoDocumento
  tomador?: string
  aseguradora?: string
  numero_poliza?: string
  vigencia_desde?: string
  vencimiento?: string
  prima_neta?: number
  impuestos?: number
  otros_recargos?: number
  prima_total?: number
  datos_ramo: DatosRamo
  pdf_url?: string
  resumen_cambios?: string
  validada: boolean
  validada_por?: string
  validada_at?: string
  notas_corredor?: string
  siniestralidad_resumen?: string
  created_at: string
  situaciones?: SituacionRiesgo[]
}

export interface SituacionRiesgo {
  id: string
  version_poliza_id: string
  orden: number
  referencia?: string
  nombre_personalizado?: string
  asegurado_situacion?: string
  direccion?: string
  descripcion_actividad?: string
  construccion_estructura?: string
  construccion_cubierta?: string
  construccion_cerramientos?: string
  inflamables?: string
  pci?: string
  seguridad_antirrobo?: string
  indice_revalorizacion?: string
  notas?: string
  capitales?: Capital[]
}

export interface Capital {
  id: string
  situacion_id: string
  bien: string
  capital?: number
  modalidad?: string
  notas?: string
  orden: number
}

export interface Riesgo {
  id: string
  cliente_id: string
  numero?: number
  categoria?: string
  descripcion?: string
  probabilidad?: number
  impacto?: number
  score?: number
  nivel?: NivelRiesgo
  control_actual?: string
  accion_mitigacion?: string
  poliza_id?: string
  responsable_cliente?: string
  updated_at: string
  created_at: string
}

export interface Alerta {
  id: string
  cliente_id: string
  poliza_id?: string
  tipo: 'vencimiento' | 'manual'
  titulo: string
  accion?: string
  responsable?: string
  fecha_limite?: string
  estado: 'pendiente' | 'en_curso' | 'completada'
  created_at: string
}

// ── DATOS ESPECÍFICOS POR RAMO (JSONB) ────────────────────────

export interface DatosRamo {
  [key: string]: unknown
}

export interface DatosDanos extends DatosRamo {
  modalidad?: string
  indice_revalorizacion?: string
  franquicia_general?: string
  limite_conjunto?: number
  asegurados_adicionales?: string[]
  // PdB
  pdb_contratada?: boolean
  pdb_capital?: number
  pdb_periodo_meses?: number
  pdb_base_calculo?: string
  pdb_franquicia_tr?: string
  pdb_franquicia_electrico?: string
  pdb_sublimite_acceso?: number
  pdb_franquicia_acceso?: string
  pdb_sublimite_suministro?: number
  pdb_franquicia_suministro?: string
  pdb_sublimite_proveedores?: number
  pdb_franquicia_proveedores?: string
  pdb_paralizacion?: boolean
  // Garantías adicionales
  proteccion_juridica?: boolean
  proteccion_juridica_limite?: number
  rc_en_poliza?: boolean
  rc_medioambiental?: boolean
  exclusiones?: string
  condiciones_especiales?: string
}

export interface DatosRC extends DatosRamo {
  empresas_aseguradas?: string[]
  asegurado_adicional_especifico?: string
  actividad_asegurada?: string
  base_calculo_prima?: string
  facturacion_declarada?: number
  tasa_prima?: number
  tasa_origen?: 'calculada' | 'extraida'
  ambito_territorial?: string
  delimitacion_temporal?: string
  limite_general?: number
  sublimite_patronal_victima?: number
  sublimite_bienes_poder?: number
  sublimite_vehiculos_terceros?: number
  sublimite_productos?: number
  sublimite_union_mezcla?: number
  franquicia_general?: number
  franquicia_productos?: number
  franquicia_union_mezcla?: number
  coberturas?: Record<string, boolean | string>
  exclusiones?: string
}

export interface DatosDO extends DatosRamo {
  filiales_cubiertas?: string[]
  directivos_cubiertos?: string
  limite_agregado?: number
  sublimite_reclamacion?: number
  side_a?: boolean
  side_b?: boolean
  side_c?: boolean
  epl?: boolean
  defensa_penal?: boolean
  investigaciones_regulatorias?: boolean
  cobertura_eeuu?: boolean
  retroactividad?: string
  periodo_cola?: string
  franquicia_general?: number
  ambito_territorial?: string
  exclusiones?: string
}

export interface DatosCyber extends DatosRamo {
  limite_agregado?: number
  facturacion_declarada?: number
  retroactividad?: string
  requisitos_seguridad?: string[]
  respuesta_incidente?: boolean | number
  recuperacion_datos?: boolean | number
  extorsion_ransomware?: boolean | number
  bi_cyber?: boolean | number
  bi_franquicia?: string
  bi_periodo_max?: string
  rc_brecha_datos?: boolean | number
  defensa_gdpr?: boolean | number
  fraude_bec?: boolean
  proveedores_cloud?: boolean
  franquicia_general?: number
  exclusiones?: string
}

export interface DatosTransporte extends DatosRamo {
  modalidad?: string
  capital_por_envio?: number
  capital_en_ruta?: number
  capital_feria?: number
  cobertura_importacion?: boolean
  cobertura_exportacion?: boolean
  cobertura_nacional?: boolean
  tipo_mercancia?: string
  medios_transporte?: string[]
  franquicia?: string
  exclusiones?: string
}

export interface DatosCredito extends DatosRamo {
  modalidad?: string
  limite_global?: number
  porcentaje_indemnizacion?: number
  facturacion_asegurada?: number
  plazo_max_credito_dias?: number
  periodo_espera_dias?: number
  mercados_cubiertos?: string
  mercados_excluidos?: string
  franquicia?: string
  proceso_declaracion?: string
  exclusiones?: string
}

// ── CONSTANTES UI ──────────────────────────────────────────────

export const RAMO_LABELS: Record<Ramo, string> = {
  danos: 'Daños / Property',
  rc_general: 'RC General',
  rc_do: 'RC D&O',
  cyber: 'Cyber',
  transporte: 'Transporte',
  credito: 'Crédito',
  otro: 'Otro',
}

export const RAMO_ORDEN: Ramo[] = ['danos', 'rc_general', 'rc_do', 'cyber', 'transporte', 'credito']

export const ESTADO_LABELS: Record<EstadoPoliza, string> = {
  vigente: 'Vigente',
  cancelada: 'Cancelada',
  en_renovacion: 'En renovación',
  vencida: 'Vencida',
  no_contratada: 'No contratada',
}

export const NIVEL_COLORS: Record<NivelRiesgo, string> = {
  bajo: 'bg-green-100 text-green-800',
  moderado: 'bg-yellow-100 text-yellow-800',
  alto: 'bg-orange-100 text-orange-800',
  extremo: 'bg-red-100 text-red-800',
}
