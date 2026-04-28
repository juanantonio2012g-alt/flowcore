import { normalizarCaso } from "@/core/domain/casos";
import { executeAgentePriorizacion } from "@/core/application/agentes/priorizacion";
import {
  derivarEstadoValidacionDiagnostico,
  normalizarTextoNullable,
} from "@/core/domain/casos/rules";
import { derivarResponsabilidadOperativa } from "@/core/domain/casos/responsabilidad-operativa";
import { derivarWorkflowDelCaso } from "@/core/domain/casos/workflow";
import type { CasoDetalleInput, CasoDetalleNormalizado } from "./contracts";
import {
  agruparAlertas,
  derivarAlertas,
  derivarAlineacionOperativa,
  derivarLecturaAplicadaRelacional,
  derivarNavegacion,
  derivarOwnershipActivo,
  derivarProgreso,
  derivarResumenExpediente,
  derivarSalud,
  derivarSintesisExpediente,
  derivarSintesisRelacional,
  derivarSintesisTrazabilidad,
  derivarTimeline,
  labelCampo,
  labelMacroarea,
  resumirAgente,
  resumirCotizacion,
  resumirDiagnostico,
  resumirEvidencia,
  resumirInforme,
  resumirLogistica,
  resumirPostventa,
  resumirSeguimiento,
} from "./rules";
import { recomendarAccionDesdeWorkflow } from "@/core/domain/casos/workflow-operativa";

export function normalizarDetalleCaso(
  input: CasoDetalleInput
): CasoDetalleNormalizado {
  const validacionDiagnostico = derivarEstadoValidacionDiagnostico({
    tieneDiagnostico: !!input.diagnostico,
    requiereValidacionManual:
      input.diagnostico?.requiere_validacion_manual ??
      input.diagnostico?.requiere_validacion,
    tieneInformeTecnico: !!input.informe,
    nivelCerteza: input.diagnostico?.nivel_certeza,
    problematicaIdentificada: input.diagnostico?.problematica_identificada,
    causaProbable: input.diagnostico?.causa_probable,
    categoriaCaso: input.diagnostico?.categoria_caso,
    solucionRecomendada: input.diagnostico?.solucion_recomendada,
    categoriaProbableAgente: input.diagnosticoAgente?.categoria_probable,
    resultadoValidacion: input.diagnostico?.resultado_validacion,
    validadoPor: input.diagnostico?.validado_por,
    fechaValidacion: input.diagnostico?.fecha_validacion,
    observacionValidacion: input.diagnostico?.observacion_validacion,
  });

  const diagnostico =
    input.diagnostico === null
      ? null
      : {
          ...input.diagnostico,
          requiere_validacion: validacionDiagnostico.requiere_validacion_final,
          requiere_validacion_manual:
            validacionDiagnostico.requiere_validacion_manual,
          requiere_validacion_derivada:
            validacionDiagnostico.requiere_validacion_derivada,
          motivo_validacion: validacionDiagnostico.motivo_validacion,
          motivos_validacion: validacionDiagnostico.motivos_validacion,
          validacion_pendiente: validacionDiagnostico.validacion_pendiente,
          validacion_resuelta: validacionDiagnostico.validacion_resuelta,
          resultado_validacion: validacionDiagnostico.resultado_validacion,
          validado_por: validacionDiagnostico.validado_por,
          observacion_validacion: validacionDiagnostico.observacion_validacion,
          fecha_validacion: validacionDiagnostico.fecha_validacion,
        };

  const estadoGlobalBase = normalizarCaso({
    ...input.caso,
    derivados: {
      ...input.caso.derivados,
      tieneInforme: !!input.informe,
      tieneDiagnostico: !!diagnostico,
      requiereValidacion: validacionDiagnostico.validacion_pendiente,
      diagnosticoRequiereValidacionManual:
        validacionDiagnostico.requiere_validacion_manual,
      diagnosticoRequiereValidacionDerivada:
        validacionDiagnostico.requiere_validacion_derivada,
      diagnosticoMotivoValidacion: validacionDiagnostico.motivo_validacion,
      diagnosticoMotivosValidacion: validacionDiagnostico.motivos_validacion,
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
    },
  });
  const workflow = derivarWorkflowDelCaso({
    caso_id: estadoGlobalBase.id,
    created_at: estadoGlobalBase.metadata.created_at,
    estado_tecnico_real: estadoGlobalBase.metadata.estado_tecnico_real,
    estado_comercial_real: estadoGlobalBase.metadata.estado_comercial_real,
    proxima_accion: normalizarTextoNullable(input.caso.caso.proxima_accion),
    proxima_fecha: input.caso.caso.proxima_fecha ?? null,
    sla_nivel: estadoGlobalBase.sla.nivel,
    requiere_validacion:
      estadoGlobalBase.metadata.requiere_validacion,
    validacion_pendiente: estadoGlobalBase.metadata.validacion_pendiente,
    validacion_resuelta: estadoGlobalBase.metadata.validacion_resuelta,
    resultado_validacion: estadoGlobalBase.metadata.resultado_validacion,
    validado_por: estadoGlobalBase.metadata.validado_por,
    fecha_validacion: estadoGlobalBase.metadata.fecha_validacion,
    tiene_informe: !!input.informe,
    informe_created_at: input.informe?.created_at ?? null,
    tiene_diagnostico: !!diagnostico,
    diagnostico_created_at: diagnostico?.created_at ?? null,
    tiene_cotizacion: !!input.cotizacion,
    cotizacion_created_at: input.cotizacion?.created_at ?? null,
    tiene_seguimiento: !!input.seguimiento,
    seguimiento_created_at: input.seguimiento?.created_at ?? null,
    seguimiento_estado_comercial: input.seguimiento?.estado_comercial ?? null,
    seguimiento_proximo_paso: input.seguimiento?.proximo_paso ?? null,
    seguimiento_proxima_fecha: input.seguimiento?.proxima_fecha ?? null,
    tiene_logistica: !!input.logistica,
    logistica_created_at: input.logistica?.created_at ?? null,
    logistica_fecha_programada: input.logistica?.fecha_programada ?? null,
    logistica_responsable: input.logistica?.responsable ?? null,
    logistica_estado: input.logistica?.estado_logistico ?? null,
    logistica_observacion: input.logistica?.observacion_logistica ?? null,
    logistica_confirmacion_entrega:
      input.logistica?.confirmacion_entrega ?? null,
    logistica_fecha_entrega: input.logistica?.fecha_entrega ?? null,
    responsable_actual: input.host.responsable_actual,
    tiene_auditoria: !!input.auditoria,
    auditoria_created_at: input.auditoria?.created_at ?? null,
    auditoria_estado: input.auditoria?.estado_auditoria ?? null,
    auditoria_fecha_auditoria: input.auditoria?.fecha_auditoria ?? null,
    auditoria_responsable: input.auditoria?.responsable_auditoria ?? null,
    auditoria_observaciones: input.auditoria?.observaciones_auditoria ?? null,
    auditoria_conformidad_cliente: input.auditoria?.conformidad_cliente ?? null,
    auditoria_requiere_correccion: input.auditoria?.requiere_correccion ?? null,
    auditoria_fecha_cierre_tecnico: input.auditoria?.fecha_cierre_tecnico ?? null,
    tiene_postventa: !!input.postventa,
    postventa_created_at: input.postventa?.created_at ?? null,
    postventa_fecha: input.postventa?.fecha_postventa ?? null,
    postventa_estado: input.postventa?.estado_postventa ?? null,
    postventa_responsable: input.postventa?.responsable_postventa ?? null,
    postventa_observacion: input.postventa?.observacion_postventa ?? null,
    postventa_requiere_accion: input.postventa?.requiere_accion ?? null,
    postventa_proxima_accion: input.postventa?.proxima_accion ?? null,
    postventa_proxima_fecha: input.postventa?.proxima_fecha ?? null,
    postventa_conformidad_final: input.postventa?.conformidad_final ?? null,
    postventa_notas: input.postventa?.notas ?? null,
    tiene_cierre_tecnico: !!input.cierreTecnico,
    cierre_tecnico_created_at: input.cierreTecnico?.created_at ?? null,
    cierre_tecnico_fecha: input.cierreTecnico?.fecha_cierre_tecnico ?? null,
    cierre_tecnico_responsable: input.cierreTecnico?.responsable_cierre ?? null,
    cierre_tecnico_motivo: input.cierreTecnico?.motivo_cierre ?? null,
    cierre_tecnico_observacion:
      input.cierreTecnico?.observacion_cierre ?? null,
    cierre_tecnico_postventa_resuelta:
      input.cierreTecnico?.postventa_resuelta ?? null,
    cierre_tecnico_requiere_postventa_adicional:
      input.cierreTecnico?.requiere_postventa_adicional ?? null,
    workflow_transitions: input.caso.derivados?.workflowTransitions ?? [],
  });

  const progreso = derivarProgreso({
    tieneInforme: !!input.informe,
    tieneDiagnostico: !!input.diagnostico,
    tieneCotizacion: !!input.cotizacion,
    tieneSeguimiento: !!input.seguimiento,
    tieneLogistica: !!input.logistica,
    tienePostventa: !!input.postventa,
    workflowEtapaActual: workflow.etapa_actual,
  });

  const salud = derivarSalud({
    slaNivel: estadoGlobalBase.sla.nivel,
    slaEtiqueta: estadoGlobalBase.sla.etiqueta,
    requiereValidacion:
      estadoGlobalBase.metadata.validacion_pendiente ??
      estadoGlobalBase.metadata.requiere_validacion,
    estadoComercialReal: estadoGlobalBase.metadata.estado_comercial_real,
    tieneSeguimiento: !!input.seguimiento,
    totalEvidencias: input.evidencias.length,
  });

  const inputNormalizado: CasoDetalleInput = {
    ...input,
    diagnostico,
    logistica: input.logistica ?? null,
    postventa: input.postventa ?? null,
    cierreTecnico: input.cierreTecnico ?? null,
  };

  const proximaAccionEfectiva = workflow.continuidad.proxima_accion ?? estadoGlobalBase.proxima_accion;
  const proximaFechaEfectiva = workflow.continuidad.proxima_fecha ?? estadoGlobalBase.proxima_fecha;
  const sintesisRelacional = derivarSintesisRelacional({
    confianza: estadoGlobalBase.metadata.nivel_confianza_cliente,
    friccion: estadoGlobalBase.metadata.nivel_friccion_cliente,
    desgaste: estadoGlobalBase.metadata.desgaste_operativo,
    claridad: estadoGlobalBase.metadata.claridad_intencion,
    conversion: estadoGlobalBase.metadata.probabilidad_conversion,
  });
  const lecturaAplicadaRelacional = derivarLecturaAplicadaRelacional({
    sintesis: sintesisRelacional,
    claridad: estadoGlobalBase.metadata.claridad_intencion,
    friccion: estadoGlobalBase.metadata.nivel_friccion_cliente,
    conversion: estadoGlobalBase.metadata.probabilidad_conversion,
    requiereValidacion:
      estadoGlobalBase.metadata.validacion_pendiente ??
      estadoGlobalBase.metadata.requiere_validacion,
    proximaAccion: proximaAccionEfectiva,
    proximaFecha: proximaFechaEfectiva,
  });
  const alertas = derivarAlertas(inputNormalizado, {
    slaEtiqueta: estadoGlobalBase.sla.etiqueta,
    slaDescripcion: estadoGlobalBase.sla.descripcion,
    proximaFecha: proximaFechaEfectiva,
    sintesisRelacional,
  });
  const timeline = derivarTimeline(inputNormalizado);
  const alertasAgrupadas = agruparAlertas(alertas);
  const sintesisTrazabilidad = derivarSintesisTrazabilidad({
    alertas,
    historial_operativo: inputNormalizado.bitacora,
    timeline,
  });

  const informe = resumirInforme(inputNormalizado);
  const evidencia = resumirEvidencia(inputNormalizado);
  const diagnostico_humano = resumirDiagnostico(inputNormalizado);
  const agente_ia = resumirAgente(inputNormalizado);
  const cotizacion = resumirCotizacion(inputNormalizado);
  const seguimiento = resumirSeguimiento(inputNormalizado);
  const logistica = resumirLogistica(inputNormalizado);
  const postventa = resumirPostventa(inputNormalizado);
  const resumenExpediente = derivarResumenExpediente({
    informe,
    diagnostico_humano,
    cotizacion,
    seguimiento,
    logistica,
    postventa,
  });
  const sintesisExpediente = derivarSintesisExpediente({
    informe,
    evidencia,
    diagnostico_humano,
    cotizacion,
    seguimiento,
    logistica,
    postventa,
    agente_ia,
  });
  const recomendacionOperativa = recomendarAccionDesdeWorkflow({
    workflow,
    prioridad: estadoGlobalBase.metadata.prioridad as
      | "urgente"
      | "alta"
      | "media"
      | "baja"
      | null,
    estadoComercialReal: estadoGlobalBase.metadata.estado_comercial_real,
    validacionPendiente:
      estadoGlobalBase.metadata.validacion_pendiente ??
      estadoGlobalBase.metadata.requiere_validacion,
  });

  const alineacionOperativa = derivarAlineacionOperativa({
    accionPrioritaria: recomendacionOperativa.accion,
    proximaAccionActual: proximaAccionEfectiva,
    proximaFechaActual: proximaFechaEfectiva,
    continuidadEstado: workflow.continuidad.estado,
    workflowEtapaActual: workflow.etapa_actual,
  });
  const priorizacionOperativaAgente = executeAgentePriorizacion({
    caso_id: estadoGlobalBase.id,
    accion_actual: proximaAccionEfectiva,
    accion_prioritaria_sistema: recomendacionOperativa.accion,
    etapa_actual: workflow.etapa_actual,
    estado_actual: estadoGlobalBase.estado,
  });
  const ownership = derivarOwnershipActivo(inputNormalizado);
  const responsabilidadOperativa = derivarResponsabilidadOperativa({
    macroareaActual: estadoGlobalBase.macroarea_actual,
    macroareaLabel: estadoGlobalBase.macroarea_label,
    responsableActual: input.host.responsable_actual,
    responsableHumanoId: input.host.responsable_humano_id,
    responsableHumanoNombre: input.host.responsable_humano_nombre,
    responsableHumanoAsignadoPor: input.host.responsable_humano_asignado_por,
    responsableHumanoAsignadoAt: input.host.responsable_humano_asignado_at,
  });

  return {
    resumen: {
      id: estadoGlobalBase.id,
      cliente_id: input.host.cliente_id,
      cliente_nombre: input.host.cliente_nombre,
      cliente_contexto: input.host.cliente_empresa ?? estadoGlobalBase.metadata.empresa ?? null,
      tipo_solicitud: input.host.tipo_solicitud,
      canal: input.host.canal_entrada,
      prioridad: estadoGlobalBase.metadata.prioridad,
      descripcion_inicial: input.host.descripcion_inicial,
    },
    estadoGlobal: {
      ...estadoGlobalBase,
      workflow,
      proxima_accion: workflow.continuidad.proxima_accion ?? estadoGlobalBase.proxima_accion,
      proxima_fecha: workflow.continuidad.proxima_fecha ?? estadoGlobalBase.proxima_fecha,
      recomendacion_operativa: {
        accion: recomendacionOperativa.accion,
        urgencia: recomendacionOperativa.urgencia,
        motivo: recomendacionOperativa.motivo,
        fecha_sugerida: recomendacionOperativa.fechaSugerida,
      },
      macroarea_actual_label: labelMacroarea(estadoGlobalBase.macroarea_actual) ?? "-",
      macroarea_siguiente_label: labelMacroarea(
        estadoGlobalBase.macroarea_siguiente
      ),
      salud,
      alineacion_operativa: alineacionOperativa,
      priorizacion_operativa_agente: priorizacionOperativaAgente,
      progreso,
    },
    estadosInternos: {
      tecnico_estado: labelCampo(estadoGlobalBase.metadata.estado_tecnico_real),
      comercial_estado: labelCampo(estadoGlobalBase.metadata.estado_comercial_real),
      estado_raw: input.host.estado_raw,
    },
    relacional: {
      sintesis: sintesisRelacional,
      confianza: labelCampo(estadoGlobalBase.metadata.nivel_confianza_cliente),
      friccion: labelCampo(estadoGlobalBase.metadata.nivel_friccion_cliente),
      desgaste_operativo: labelCampo(estadoGlobalBase.metadata.desgaste_operativo),
      claridad_intencion: labelCampo(estadoGlobalBase.metadata.claridad_intencion),
      conversion: labelCampo(estadoGlobalBase.metadata.probabilidad_conversion),
      lectura_aplicada: lecturaAplicadaRelacional,
    },
    trazabilidad: {
      sintesis: sintesisTrazabilidad,
      alertas,
      alertas_agrupadas: alertasAgrupadas,
      historial_operativo: inputNormalizado.bitacora,
      timeline,
    },
    ownership: {
      responsable_actual: input.host.responsable_actual,
      responsable_humano_id: responsabilidadOperativa.responsable_humano_id,
      responsable_humano: responsabilidadOperativa.responsable_humano,
      responsable_humano_label: responsabilidadOperativa.responsable_humano_label,
      responsable_humano_asignado_por:
        responsabilidadOperativa.responsable_humano_asignado_por,
      responsable_humano_asignado_at:
        responsabilidadOperativa.responsable_humano_asignado_at,
      agente_ia_activo: responsabilidadOperativa.agente_ia_activo,
      agente_operativo_activo: responsabilidadOperativa.agente_operativo_activo,
      creado_por: input.host.creado_por,
      diagnostico_por: input.host.diagnostico_por,
      cotizacion_por: input.host.cotizacion_por,
      seguimiento_por: input.host.seguimiento_por,
      activos: ownership.activos,
      resumen: ownership.resumen,
    },
    expediente: {
      resumen: resumenExpediente,
      sintesis: sintesisExpediente,
      informe,
      evidencia,
      diagnostico_humano,
      agente_ia,
      cotizacion,
      seguimiento,
      logistica,
      postventa,
    },
    navegacion: derivarNavegacion(
      estadoGlobalBase.id,
      recomendacionOperativa.accion
    ),
    metadata: {
      origen: input.caso.metadata?.origen ?? "opencore-host",
      timestamp:
        input.caso.metadata?.timestamp ?? new Date().toISOString(),
    },
  };
}
