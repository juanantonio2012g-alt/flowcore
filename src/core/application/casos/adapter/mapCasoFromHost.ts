import type { CasoInput } from "@/core/domain/casos";
import { derivarEstadoValidacionDiagnostico } from "@/core/domain/casos/rules";
import type { PersistedWorkflowTransition } from "@/core/domain/casos";
import type { AuditoriaEstado, PostventaEstado } from "@/lib/domain/casos/types";

type HostCliente =
  | {
      id: string;
      nombre: string;
      empresa: string | null;
    }
  | {
      id: string;
      nombre: string;
      empresa: string | null;
    }[]
  | null;

export type HostCasoBaseRecord = {
  id: string;
  prioridad: string | null;
  created_at: string | null;
  estado_tecnico: string | null;
  estado_comercial: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  tipo_solicitud: string | null;
  nivel_confianza_cliente: string | null;
  nivel_friccion_cliente: string | null;
  desgaste_operativo: string | null;
  claridad_intencion: string | null;
  probabilidad_conversion: string | null;
  observacion_relacional: string | null;
  responsable_actual?: string | null;
  responsable_humano_id?: string | null;
  responsable_humano_nombre?: string | null;
  responsable_humano_asignado_por?: string | null;
  responsable_humano_asignado_at?: string | null;
  cliente_id: string | null;
  clientes: HostCliente;
};

export type HostInformeRecord = {
  id: string;
  caso_id: string;
  created_at?: string | null;
};

export type HostAuditoriaRecord = {
  id: string;
  caso_id: string;
  fecha_auditoria: string | null;
  responsable_auditoria?: string | null;
  estado_auditoria?: string | null;
  observaciones_auditoria?: string | null;
  conformidad_cliente?: boolean | null;
  requiere_correccion?: boolean | null;
  fecha_cierre_tecnico?: string | null;
  created_at?: string | null;
};

export type HostDiagnosticoRecord = {
  id: string;
  caso_id: string;
  problematica_identificada?: string | null;
  causa_probable?: string | null;
  nivel_certeza?: string | null;
  categoria_caso?: string | null;
  solucion_recomendada?: string | null;
  requiere_validacion: boolean | null;
  validado_por?: string | null;
  resultado_validacion?: string | null;
  observacion_validacion?: string | null;
  fecha_validacion?: string | null;
  created_at?: string | null;
};

export type HostPostventaRecord = {
  id: string;
  caso_id: string;
  fecha_postventa: string | null;
  estado_postventa?: string | null;
  observacion_postventa?: string | null;
  requiere_accion?: boolean | null;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
  conformidad_final?: boolean | null;
  responsable_postventa?: string | null;
  notas?: string | null;
  created_at?: string | null;
};

export type HostCierreTecnicoRecord = {
  id: string;
  caso_id: string;
  fecha_cierre_tecnico: string | null;
  responsable_cierre?: string | null;
  motivo_cierre?: string | null;
  observacion_cierre?: string | null;
  postventa_resuelta?: boolean | null;
  requiere_postventa_adicional?: boolean | null;
  created_at?: string | null;
};

export type HostCotizacionRecord = {
  id: string;
  caso_id: string;
  estado: string | null;
  created_at?: string | null;
};

export type HostSeguimientoRecord = {
  id: string;
  caso_id: string;
  estado_comercial: string | null;
  senales_comerciales?: string[] | null;
  proximo_paso: string | null;
  proxima_fecha: string | null;
  created_at?: string | null;
};

export type HostLogisticaRecord = {
  id: string;
  caso_id: string;
  fecha_programada: string | null;
  responsable: string | null;
  estado_logistico: string | null;
  observacion_logistica: string | null;
  confirmacion_entrega: boolean | null;
  fecha_entrega: string | null;
  created_at?: string | null;
};

export type HostWorkflowTransitionRecord = {
  id: string;
  caso_id: string;
  transition_code: PersistedWorkflowTransition["transition_code"];
  from_stage: PersistedWorkflowTransition["from_stage"];
  to_stage: PersistedWorkflowTransition["to_stage"];
  status: PersistedWorkflowTransition["status"];
  actor: string | null;
  origin: string;
  occurred_at: string;
  observacion: string | null;
  evidencia_ref: string | null;
};

export type HostCasoReadModel = {
  caso: HostCasoBaseRecord;
  informe?: HostInformeRecord | null;
  diagnostico?: HostDiagnosticoRecord | null;
  cotizacion?: HostCotizacionRecord | null;
  seguimiento?: HostSeguimientoRecord | null;
  logistica?: HostLogisticaRecord | null;
  auditoria?: HostAuditoriaRecord | null;
  postventa?: HostPostventaRecord | null;
  cierreTecnico?: HostCierreTecnicoRecord | null;
  workflowTransitions?: HostWorkflowTransitionRecord[] | null;
  origen?: string;
  timestamp?: string;
};

function textoONull(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio || null;
}

function normalizarAuditoriaEstado(
  valor: string | null | undefined
): AuditoriaEstado | null {
  const normalizado = textoONull(valor);
  if (
    normalizado === "pendiente" ||
    normalizado === "en_revision" ||
    normalizado === "conforme" ||
    normalizado === "con_observaciones" ||
    normalizado === "requiere_correccion" ||
    normalizado === "cerrada"
  ) {
    return normalizado;
  }
  return null;
}

function normalizarPostventaEstado(
  valor: string | null | undefined
): PostventaEstado | null {
  const normalizado = textoONull(valor);
  if (
    normalizado === "abierta" ||
    normalizado === "en_seguimiento" ||
    normalizado === "requiere_accion" ||
    normalizado === "resuelta" ||
    normalizado === "cerrada"
  ) {
    return normalizado;
  }

  return null;
}

export function mapCasoFromHost(host: HostCasoReadModel): CasoInput {
  const validacionDiagnostico = derivarEstadoValidacionDiagnostico({
    tieneDiagnostico: !!host.diagnostico,
    requiereValidacionManual: host.diagnostico?.requiere_validacion,
    tieneInformeTecnico: !!host.informe,
    nivelCerteza: host.diagnostico?.nivel_certeza,
    problematicaIdentificada: host.diagnostico?.problematica_identificada,
    causaProbable: host.diagnostico?.causa_probable,
    categoriaCaso: host.diagnostico?.categoria_caso,
    solucionRecomendada: host.diagnostico?.solucion_recomendada,
    resultadoValidacion: host.diagnostico?.resultado_validacion,
    validadoPor: host.diagnostico?.validado_por,
    fechaValidacion: host.diagnostico?.fecha_validacion,
    observacionValidacion: host.diagnostico?.observacion_validacion,
  });

  return {
    caso: {
      id: host.caso.id,
      prioridad: textoONull(host.caso.prioridad),
      created_at: host.caso.created_at,
      estado_tecnico: textoONull(host.caso.estado_tecnico),
      estado_comercial: textoONull(host.caso.estado_comercial),
      proxima_accion: textoONull(host.caso.proxima_accion),
      proxima_fecha: host.caso.proxima_fecha,
      tipo_solicitud: textoONull(host.caso.tipo_solicitud),
      nivel_confianza_cliente: textoONull(host.caso.nivel_confianza_cliente),
      nivel_friccion_cliente: textoONull(host.caso.nivel_friccion_cliente),
      desgaste_operativo: textoONull(host.caso.desgaste_operativo),
      claridad_intencion: textoONull(host.caso.claridad_intencion),
      probabilidad_conversion: textoONull(host.caso.probabilidad_conversion),
      observacion_relacional: textoONull(host.caso.observacion_relacional),
      cliente_id: host.caso.cliente_id,
      clientes: host.caso.clientes,
    },
    derivados: {
      tieneInforme: !!host.informe,
      informeCreatedAt: host.informe?.created_at ?? null,
      tieneDiagnostico: !!host.diagnostico,
      diagnosticoCreatedAt: host.diagnostico?.created_at ?? null,
      requiereValidacion: validacionDiagnostico.validacion_pendiente,
      diagnosticoRequiereValidacionManual:
        validacionDiagnostico.requiere_validacion_manual,
      diagnosticoRequiereValidacionDerivada:
        validacionDiagnostico.requiere_validacion_derivada,
      diagnosticoMotivoValidacion: validacionDiagnostico.motivo_validacion,
      diagnosticoMotivosValidacion:
        validacionDiagnostico.motivos_validacion,
      diagnosticoValidacionPendiente:
        validacionDiagnostico.validacion_pendiente,
      diagnosticoValidacionResuelta:
        validacionDiagnostico.validacion_resuelta,
      diagnosticoResultadoValidacion:
        validacionDiagnostico.resultado_validacion,
      diagnosticoValidadoPor: validacionDiagnostico.validado_por,
      diagnosticoFechaValidacion: validacionDiagnostico.fecha_validacion,
      diagnosticoObservacionValidacion:
        validacionDiagnostico.observacion_validacion,
      tieneCotizacion: !!host.cotizacion,
      cotizacionCreatedAt: host.cotizacion?.created_at ?? null,
      cotizacionEstado: textoONull(host.cotizacion?.estado),
      tieneSeguimiento: !!host.seguimiento,
      seguimientoCreatedAt: host.seguimiento?.created_at ?? null,
      seguimientoEstadoComercial: textoONull(host.seguimiento?.estado_comercial),
      seguimientoProximoPaso: textoONull(host.seguimiento?.proximo_paso),
      seguimientoProximaFecha: host.seguimiento?.proxima_fecha ?? null,
      tieneLogistica: !!host.logistica,
      logisticaCreatedAt: host.logistica?.created_at ?? null,
      logisticaFechaProgramada: host.logistica?.fecha_programada ?? null,
      logisticaResponsable: textoONull(host.logistica?.responsable),
      logisticaEstado: textoONull(host.logistica?.estado_logistico),
      logisticaObservacion: textoONull(host.logistica?.observacion_logistica),
      logisticaConfirmacionEntrega:
        host.logistica?.confirmacion_entrega ?? null,
      logisticaFechaEntrega: host.logistica?.fecha_entrega ?? null,
      auditoriaCreatedAt: host.auditoria?.created_at ?? null,
      auditoriaEstado: normalizarAuditoriaEstado(host.auditoria?.estado_auditoria),
      auditoriaFechaAuditoria: host.auditoria?.fecha_auditoria ?? null,
      auditoriaResponsable: textoONull(host.auditoria?.responsable_auditoria),
      auditoriaObservaciones: textoONull(host.auditoria?.observaciones_auditoria),
      auditoriaConformidadCliente:
        host.auditoria?.conformidad_cliente ?? null,
      auditoriaRequiereCorreccion:
        host.auditoria?.requiere_correccion ?? null,
      auditoriaFechaCierreTecnico: host.auditoria?.fecha_cierre_tecnico ?? null,
      tienePostventa: !!host.postventa,
      postventaCreatedAt: host.postventa?.created_at ?? null,
      postventaFecha: host.postventa?.fecha_postventa ?? null,
      postventaEstado: normalizarPostventaEstado(host.postventa?.estado_postventa),
      postventaResponsable: textoONull(host.postventa?.responsable_postventa),
      postventaObservacion: textoONull(host.postventa?.observacion_postventa),
      postventaRequiereAccion: host.postventa?.requiere_accion ?? null,
      postventaProximaAccion: textoONull(host.postventa?.proxima_accion),
      postventaProximaFecha: host.postventa?.proxima_fecha ?? null,
      postventaConformidadFinal: host.postventa?.conformidad_final ?? null,
      postventaNotas: textoONull(host.postventa?.notas),
      tieneCierreTecnico: !!host.cierreTecnico,
      cierreTecnicoCreatedAt: host.cierreTecnico?.created_at ?? null,
      cierreTecnicoFecha: host.cierreTecnico?.fecha_cierre_tecnico ?? null,
      cierreTecnicoResponsable: textoONull(host.cierreTecnico?.responsable_cierre),
      cierreTecnicoMotivo: textoONull(host.cierreTecnico?.motivo_cierre),
      cierreTecnicoObservacion: textoONull(host.cierreTecnico?.observacion_cierre),
      cierreTecnicoPostventaResuelta:
        host.cierreTecnico?.postventa_resuelta ?? null,
      cierreTecnicoRequierePostventaAdicional:
        host.cierreTecnico?.requiere_postventa_adicional ?? null,
      workflowTransitions:
        (host.workflowTransitions ?? []).map((transition) => ({
          id: transition.id,
          transition_code: transition.transition_code,
          from_stage: transition.from_stage ?? null,
          to_stage: transition.to_stage ?? null,
          status: transition.status,
          actor: textoONull(transition.actor),
          origin: transition.origin,
          occurred_at: transition.occurred_at,
          observacion: textoONull(transition.observacion),
          evidencia_ref: textoONull(transition.evidencia_ref),
        })) ?? [],
    },
    metadata: {
      origen: host.origen ?? "supabase-host",
      timestamp: host.timestamp,
    },
  };
}
