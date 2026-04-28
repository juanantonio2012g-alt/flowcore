import {
  normalizarCaso as normalizarCasoBase,
} from "@/lib/domain/casos";
import type { CasoInput, CasoNormalizado } from "./contracts";
import {
  derivarEstadoCaso,
  normalizarTextoNullable,
  obtenerEstadoLabel,
  resolverTimestamp,
} from "./rules";
import { derivarWorkflowDelCaso } from "./workflow";
import {
  calcularEstadoSlaDesdeWorkflow,
  derivarRiesgoDesdeWorkflow,
  recomendarAccionDesdeWorkflow,
} from "./workflow-operativa";

export function normalizarCaso(input: CasoInput): CasoNormalizado {
  const normalizado = normalizarCasoBase(
    input.caso,
    input.derivados ?? {}
  );
  const requiereValidacionEstructural =
    (input.derivados?.diagnosticoRequiereValidacionManual ?? false) ||
    (input.derivados?.diagnosticoRequiereValidacionDerivada ?? false);
  const validacionPendiente =
    input.derivados?.diagnosticoValidacionPendiente ??
    normalizado.requiere_validacion;
  const workflow = derivarWorkflowDelCaso({
    caso_id: normalizado.id,
    created_at: normalizado.created_at,
    estado_tecnico_real: normalizado.estado_tecnico_real,
    estado_comercial_real: normalizado.estado_comercial_real,
    proxima_accion: normalizarTextoNullable(input.caso.proxima_accion),
    proxima_fecha: input.caso.proxima_fecha ?? null,
    sla_nivel: normalizado.sla_nivel,
    requiere_validacion: requiereValidacionEstructural || validacionPendiente,
    validacion_pendiente: validacionPendiente,
    validacion_resuelta:
      input.derivados?.diagnosticoValidacionResuelta ?? false,
    resultado_validacion:
      input.derivados?.diagnosticoResultadoValidacion ?? null,
    validado_por: input.derivados?.diagnosticoValidadoPor ?? null,
    fecha_validacion: input.derivados?.diagnosticoFechaValidacion ?? null,
    tiene_informe: input.derivados?.tieneInforme ?? false,
    informe_created_at: input.derivados?.informeCreatedAt ?? null,
    tiene_diagnostico: input.derivados?.tieneDiagnostico ?? false,
    diagnostico_created_at: input.derivados?.diagnosticoCreatedAt ?? null,
    tiene_cotizacion: input.derivados?.tieneCotizacion ?? false,
    cotizacion_created_at: input.derivados?.cotizacionCreatedAt ?? null,
    tiene_seguimiento: input.derivados?.tieneSeguimiento ?? false,
    seguimiento_created_at: input.derivados?.seguimientoCreatedAt ?? null,
    seguimiento_estado_comercial:
      input.derivados?.seguimientoEstadoComercial ?? null,
    seguimiento_proximo_paso:
      input.derivados?.seguimientoProximoPaso ?? null,
    seguimiento_proxima_fecha:
      input.derivados?.seguimientoProximaFecha ?? null,
    tiene_logistica: input.derivados?.tieneLogistica ?? false,
    logistica_created_at: input.derivados?.logisticaCreatedAt ?? null,
    logistica_fecha_programada:
      input.derivados?.logisticaFechaProgramada ?? null,
    logistica_responsable: input.derivados?.logisticaResponsable ?? null,
    logistica_estado: input.derivados?.logisticaEstado ?? null,
    logistica_observacion: input.derivados?.logisticaObservacion ?? null,
    logistica_confirmacion_entrega:
      input.derivados?.logisticaConfirmacionEntrega ?? null,
    logistica_fecha_entrega: input.derivados?.logisticaFechaEntrega ?? null,
    auditoria_created_at: input.derivados?.auditoriaCreatedAt ?? null,
    auditoria_estado: input.derivados?.auditoriaEstado ?? null,
    auditoria_fecha_auditoria: input.derivados?.auditoriaFechaAuditoria ?? null,
    auditoria_responsable: input.derivados?.auditoriaResponsable ?? null,
    auditoria_observaciones: input.derivados?.auditoriaObservaciones ?? null,
    auditoria_conformidad_cliente:
      input.derivados?.auditoriaConformidadCliente ?? null,
    auditoria_requiere_correccion:
      input.derivados?.auditoriaRequiereCorreccion ?? null,
    auditoria_fecha_cierre_tecnico:
      input.derivados?.auditoriaFechaCierreTecnico ?? null,
    tiene_postventa: input.derivados?.tienePostventa ?? false,
    postventa_created_at: input.derivados?.postventaCreatedAt ?? null,
    postventa_fecha: input.derivados?.postventaFecha ?? null,
    postventa_estado: input.derivados?.postventaEstado ?? null,
    postventa_responsable: input.derivados?.postventaResponsable ?? null,
    postventa_observacion: input.derivados?.postventaObservacion ?? null,
    postventa_requiere_accion:
      input.derivados?.postventaRequiereAccion ?? null,
    postventa_proxima_accion:
      input.derivados?.postventaProximaAccion ?? null,
    postventa_proxima_fecha: input.derivados?.postventaProximaFecha ?? null,
    postventa_conformidad_final:
      input.derivados?.postventaConformidadFinal ?? null,
    postventa_notas: input.derivados?.postventaNotas ?? null,
    tiene_cierre_tecnico: input.derivados?.tieneCierreTecnico ?? false,
    cierre_tecnico_created_at:
      input.derivados?.cierreTecnicoCreatedAt ?? null,
    cierre_tecnico_fecha: input.derivados?.cierreTecnicoFecha ?? null,
    cierre_tecnico_responsable:
      input.derivados?.cierreTecnicoResponsable ?? null,
    cierre_tecnico_motivo: input.derivados?.cierreTecnicoMotivo ?? null,
    cierre_tecnico_observacion:
      input.derivados?.cierreTecnicoObservacion ?? null,
    cierre_tecnico_postventa_resuelta:
      input.derivados?.cierreTecnicoPostventaResuelta ?? null,
    cierre_tecnico_requiere_postventa_adicional:
      input.derivados?.cierreTecnicoRequierePostventaAdicional ?? null,
    workflow_transitions: input.derivados?.workflowTransitions ?? [],
  });
  const workflowCerrado = workflow.estado_workflow === "cerrado";
  const estado = workflowCerrado ? "cerrado" : derivarEstadoCaso(normalizado);
  const sla = calcularEstadoSlaDesdeWorkflow({
    workflow,
    prioridad: normalizado.prioridad as
      | "urgente"
      | "alta"
      | "media"
      | "baja"
      | null,
    createdAt: normalizado.created_at,
  });
  const riesgo = derivarRiesgoDesdeWorkflow({
    workflow,
    sla,
    estadoComercialReal: normalizado.estado_comercial_real,
  });
  const recomendacionOperativa = recomendarAccionDesdeWorkflow({
    workflow,
    prioridad: normalizado.prioridad as
      | "urgente"
      | "alta"
      | "media"
      | "baja"
      | null,
    estadoComercialReal: normalizado.estado_comercial_real,
    validacionPendiente,
  });

  return {
    id: normalizado.id,
    estado,
    estado_label: obtenerEstadoLabel(estado),
    workflow,
    macroarea_actual: normalizado.macroarea_actual,
    macroarea_siguiente: normalizado.macroarea_siguiente,
    macroarea_label: normalizado.macroarea_label,
    macroarea_orden: normalizado.macroarea_orden,
    riesgo,
    sla: {
      nivel: sla.nivel,
      etiqueta: sla.etiqueta,
      descripcion: sla.descripcion,
    },
    proxima_accion:
      workflowCerrado
        ? null
        : workflow.continuidad.proxima_accion ??
          normalizarTextoNullable(normalizado.proxima_accion_real),
    proxima_fecha:
      workflowCerrado
        ? null
        : workflow.continuidad.proxima_fecha ?? normalizado.proxima_fecha_real,
    recomendacion_operativa: {
      accion: recomendacionOperativa.accion,
      urgencia: recomendacionOperativa.urgencia,
      motivo: recomendacionOperativa.motivo,
      fecha_sugerida: recomendacionOperativa.fechaSugerida,
    },
    metadata: {
      origen: input.metadata?.origen ?? "opencore-host",
      timestamp: resolverTimestamp(input.metadata?.timestamp),
      cliente_id: normalizado.cliente_id,
      cliente: normalizado.cliente,
      empresa: normalizado.empresa,
      created_at: normalizado.created_at,
      prioridad: normalizado.prioridad,
      estado_tecnico_real: normalizado.estado_tecnico_real,
      estado_comercial_real: normalizado.estado_comercial_real,
      requiere_validacion:
        requiereValidacionEstructural || validacionPendiente,
      requiere_validacion_manual:
        input.derivados?.diagnosticoRequiereValidacionManual ?? false,
      requiere_validacion_derivada:
        input.derivados?.diagnosticoRequiereValidacionDerivada ?? false,
      motivo_validacion: input.derivados?.diagnosticoMotivoValidacion ?? [],
      motivos_validacion:
        input.derivados?.diagnosticoMotivosValidacion ??
        input.derivados?.diagnosticoMotivoValidacion ??
        [],
      validacion_pendiente:
        validacionPendiente,
      validacion_resuelta:
        input.derivados?.diagnosticoValidacionResuelta ?? false,
      resultado_validacion:
        input.derivados?.diagnosticoResultadoValidacion ?? null,
      validado_por: input.derivados?.diagnosticoValidadoPor ?? null,
      fecha_validacion: input.derivados?.diagnosticoFechaValidacion ?? null,
      observacion_validacion:
        input.derivados?.diagnosticoObservacionValidacion ?? null,
      nivel_confianza_cliente: normalizado.nivel_confianza_cliente,
      nivel_friccion_cliente: normalizado.nivel_friccion_cliente,
      desgaste_operativo: normalizado.desgaste_operativo,
      claridad_intencion: normalizado.claridad_intencion,
      probabilidad_conversion: normalizado.probabilidad_conversion,
      observacion_relacional: normalizado.observacion_relacional,
      macroarea_motivo: normalizado.macroarea_motivo,
    },
  };
}
