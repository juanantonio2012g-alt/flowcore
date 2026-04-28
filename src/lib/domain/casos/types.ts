import type { EtapaProcesoActual } from "./proceso-actual";

export type RiesgoCaso = "alto" | "medio" | "bajo";
export type MacroareaCaso = "operaciones" | "tecnico" | "comercial" | "administracion";

export type ClienteRelacionado = {
  id: string;
  nombre: string;
  empresa: string | null;
};

export type CasoBaseDominio = {
  id: string;
  prioridad: string | null;
  created_at: string | null;
  estado_tecnico?: string | null;
  estado_comercial?: string | null;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
  tipo_solicitud?: string | null;
  nivel_confianza_cliente?: string | null;
  nivel_friccion_cliente?: string | null;
  desgaste_operativo?: string | null;
  claridad_intencion?: string | null;
  probabilidad_conversion?: string | null;
  observacion_relacional?: string | null;
  cliente_id?: string | null;
  clientes?: ClienteRelacionado | ClienteRelacionado[] | null;
};

export type AuditoriaEstado =
  | "pendiente"
  | "en_revision"
  | "conforme"
  | "con_observaciones"
  | "requiere_correccion"
  | "cerrada";

export type PostventaEstado =
  | "abierta"
  | "en_seguimiento"
  | "requiere_accion"
  | "resuelta"
  | "cerrada";

export type CierreTecnicoEstado = "registrado";

export type CasoDerivadosDominio = {
  tieneInforme?: boolean;
  informeCreatedAt?: string | null;
  tieneDiagnostico?: boolean;
  diagnosticoCreatedAt?: string | null;
  requiereValidacion?: boolean;
  diagnosticoRequiereValidacionManual?: boolean;
  diagnosticoRequiereValidacionDerivada?: boolean;
  diagnosticoMotivoValidacion?: string[];
  diagnosticoMotivosValidacion?: string[];
  diagnosticoValidacionPendiente?: boolean;
  diagnosticoValidacionResuelta?: boolean;
  diagnosticoResultadoValidacion?: string | null;
  diagnosticoValidadoPor?: string | null;
  diagnosticoFechaValidacion?: string | null;
  diagnosticoObservacionValidacion?: string | null;
  tieneCotizacion?: boolean;
  cotizacionCreatedAt?: string | null;
  cotizacionEstado?: string | null;
  tieneSeguimiento?: boolean;
  seguimientoCreatedAt?: string | null;
  seguimientoEstadoComercial?: string | null;
  seguimientoProximoPaso?: string | null;
  seguimientoProximaFecha?: string | null;
  tieneLogistica?: boolean;
  logisticaCreatedAt?: string | null;
  logisticaFechaProgramada?: string | null;
  logisticaResponsable?: string | null;
  logisticaEstado?: string | null;
  logisticaObservacion?: string | null;
  logisticaConfirmacionEntrega?: boolean | null;
  logisticaFechaEntrega?: string | null;
  auditoriaCreatedAt?: string | null;
  auditoriaEstado?: AuditoriaEstado | null;
  auditoriaFechaAuditoria?: string | null;
  auditoriaResponsable?: string | null;
  auditoriaObservaciones?: string | null;
  auditoriaConformidadCliente?: boolean | null;
  auditoriaRequiereCorreccion?: boolean | null;
  auditoriaFechaCierreTecnico?: string | null;
  tienePostventa?: boolean;
  postventaCreatedAt?: string | null;
  postventaFecha?: string | null;
  postventaEstado?: PostventaEstado | null;
  postventaResponsable?: string | null;
  postventaObservacion?: string | null;
  postventaRequiereAccion?: boolean | null;
  postventaProximaAccion?: string | null;
  postventaProximaFecha?: string | null;
  postventaConformidadFinal?: boolean | null;
  postventaNotas?: string | null;
  tieneCierreTecnico?: boolean;
  cierreTecnicoCreatedAt?: string | null;
  cierreTecnicoFecha?: string | null;
  cierreTecnicoResponsable?: string | null;
  cierreTecnicoMotivo?: string | null;
  cierreTecnicoObservacion?: string | null;
  cierreTecnicoPostventaResuelta?: boolean | null;
  cierreTecnicoRequierePostventaAdicional?: boolean | null;
  workflowTransitions?: Array<{
    id: string;
    transition_code:
      | "diagnostico_validado"
      | "cotizacion_emitida"
      | "cliente_aprobo"
      | "cliente_rechazo"
      | "cierre_sin_conversion"
      | "postventa_abierta"
      | "cierre_tecnico_habilitado"
      | "cierre_tecnico_registrado";
    from_stage: EtapaProcesoActual | null;
    to_stage: EtapaProcesoActual | null;
    status: "resuelta" | "bloqueada" | "habilitada";
    actor: string | null;
    origin: string;
    occurred_at: string;
    observacion: string | null;
    evidencia_ref: string | null;
  }>;
};

export type CasoNormalizado = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  empresa: string;
  proyecto: string;
  prioridad: string | null;
  estado_tecnico_real: string;
  estado_comercial_real: string;
  proxima_accion_real: string;
  proxima_fecha_real: string | null;
  riesgo: RiesgoCaso;
  sla_nivel: "rojo" | "amarillo" | "verde";
  sla_etiqueta: string;
  sla_descripcion: string;
  requiere_validacion: boolean;
  nivel_confianza_cliente: string;
  nivel_friccion_cliente: string;
  desgaste_operativo: string;
  claridad_intencion: string;
  probabilidad_conversion: string;
  observacion_relacional: string;
  recomendacion_accion: string;
  recomendacion_urgencia: "alta" | "media" | "baja";
  recomendacion_motivo: string;
  recomendacion_fecha: string | null;
  macroarea_actual: MacroareaCaso;
  macroarea_siguiente: MacroareaCaso | null;
  macroarea_label: string;
  macroarea_orden: number;
  macroarea_motivo: string;
  created_at: string | null;
};
