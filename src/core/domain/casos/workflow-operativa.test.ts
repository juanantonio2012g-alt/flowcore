import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcularEstadoSlaDesdeWorkflow,
  recomendarAccionDesdeWorkflow,
} from "./workflow-operativa";
import { derivarWorkflowDelCaso } from "./workflow";

function crearWorkflow(
  partial: Partial<Parameters<typeof derivarWorkflowDelCaso>[0]> = {}
) {
  return derivarWorkflowDelCaso({
    caso_id: partial.caso_id ?? "caso-1",
    created_at: partial.created_at ?? "2099-01-01T00:00:00.000Z",
    estado_tecnico_real: partial.estado_tecnico_real ?? "solucion_definida",
    estado_comercial_real: partial.estado_comercial_real ?? "cotizado",
    proxima_accion: partial.proxima_accion ?? "Dar seguimiento comercial",
    proxima_fecha: partial.proxima_fecha ?? "2099-01-05",
    sla_nivel: partial.sla_nivel ?? "verde",
    requiere_validacion: partial.requiere_validacion ?? false,
    validacion_pendiente: partial.validacion_pendiente ?? false,
    validacion_resuelta: partial.validacion_resuelta ?? false,
    resultado_validacion: partial.resultado_validacion ?? null,
    validado_por: partial.validado_por ?? null,
    fecha_validacion: partial.fecha_validacion ?? null,
    tiene_informe: partial.tiene_informe ?? true,
    informe_created_at:
      partial.informe_created_at ?? "2099-01-02T00:00:00.000Z",
    tiene_diagnostico: partial.tiene_diagnostico ?? true,
    diagnostico_created_at:
      partial.diagnostico_created_at ?? "2099-01-03T00:00:00.000Z",
    tiene_cotizacion: partial.tiene_cotizacion ?? true,
    cotizacion_created_at:
      partial.cotizacion_created_at ?? "2099-01-04T00:00:00.000Z",
    tiene_seguimiento: partial.tiene_seguimiento ?? false,
    seguimiento_created_at:
      partial.seguimiento_created_at ?? "2099-01-05T00:00:00.000Z",
    seguimiento_estado_comercial: partial.seguimiento_estado_comercial ?? null,
    seguimiento_proximo_paso: partial.seguimiento_proximo_paso ?? null,
    seguimiento_proxima_fecha: partial.seguimiento_proxima_fecha ?? null,
    responsable_actual: partial.responsable_actual ?? "Comercial",
    tiene_logistica: partial.tiene_logistica ?? false,
    logistica_created_at: partial.logistica_created_at ?? null,
    logistica_fecha_programada: partial.logistica_fecha_programada ?? null,
    logistica_responsable: partial.logistica_responsable ?? null,
    logistica_estado: partial.logistica_estado ?? null,
    logistica_observacion: partial.logistica_observacion ?? null,
    logistica_confirmacion_entrega: partial.logistica_confirmacion_entrega ?? null,
    logistica_fecha_entrega: partial.logistica_fecha_entrega ?? null,
    tiene_auditoria: partial.tiene_auditoria ?? false,
    auditoria_created_at: partial.auditoria_created_at ?? null,
    auditoria_estado: partial.auditoria_estado ?? null,
    auditoria_fecha_auditoria: partial.auditoria_fecha_auditoria ?? null,
    auditoria_responsable: partial.auditoria_responsable ?? null,
    auditoria_observaciones: partial.auditoria_observaciones ?? null,
    auditoria_conformidad_cliente: partial.auditoria_conformidad_cliente ?? null,
    auditoria_requiere_correccion: partial.auditoria_requiere_correccion ?? null,
    auditoria_fecha_cierre_tecnico: partial.auditoria_fecha_cierre_tecnico ?? null,
    tiene_postventa: partial.tiene_postventa ?? false,
    postventa_created_at: partial.postventa_created_at ?? null,
    postventa_fecha: partial.postventa_fecha ?? null,
    postventa_estado: partial.postventa_estado ?? null,
    postventa_responsable: partial.postventa_responsable ?? null,
    postventa_observacion: partial.postventa_observacion ?? null,
    postventa_requiere_accion: partial.postventa_requiere_accion ?? null,
    postventa_proxima_accion: partial.postventa_proxima_accion ?? null,
    postventa_proxima_fecha: partial.postventa_proxima_fecha ?? null,
    postventa_conformidad_final: partial.postventa_conformidad_final ?? null,
    postventa_notas: partial.postventa_notas ?? null,
    tiene_cierre_tecnico: partial.tiene_cierre_tecnico ?? false,
    cierre_tecnico_created_at: partial.cierre_tecnico_created_at ?? null,
    cierre_tecnico_fecha: partial.cierre_tecnico_fecha ?? null,
    cierre_tecnico_responsable: partial.cierre_tecnico_responsable ?? null,
    cierre_tecnico_motivo: partial.cierre_tecnico_motivo ?? null,
    cierre_tecnico_observacion: partial.cierre_tecnico_observacion ?? null,
    cierre_tecnico_postventa_resuelta:
      partial.cierre_tecnico_postventa_resuelta ?? null,
    cierre_tecnico_requiere_postventa_adicional:
      partial.cierre_tecnico_requiere_postventa_adicional ?? null,
    workflow_transitions: partial.workflow_transitions ?? undefined,
  });
}

describe("core/domain/casos/workflow-operativa", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("detecta SLA incoherente cuando el expediente va por comercial sin cotización formal", () => {
    const workflow = crearWorkflow({
      estado_tecnico_real: "informe_recibido",
      estado_comercial_real: "en_proceso",
      proxima_accion: "Dar seguimiento comercial",
      proxima_fecha: "2099-01-06",
      tiene_diagnostico: false,
      tiene_cotizacion: false,
      tiene_seguimiento: false,
    });

    const sla = calcularEstadoSlaDesdeWorkflow({
      workflow,
      prioridad: "media",
      createdAt: "2099-01-01T00:00:00.000Z",
    });
    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "en_proceso",
      validacionPendiente: false,
    });

    expect(workflow.alineacion.sla_vs_workflow).toBe("inconsistente");
    expect(sla.etiqueta).toBe("SLA con alineación pendiente");
    expect(recomendacion.accion).toBe("Preparar cotización");
  });

  it("ya no recomienda dar seguimiento como si faltara cuando existe seguimiento reciente", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "negociacion",
      proxima_accion: "Llamar para cerrar definición",
      proxima_fecha: "2099-01-06",
      tiene_seguimiento: true,
      seguimiento_estado_comercial: "negociacion",
      seguimiento_proximo_paso: "Llamar para cerrar definición",
      seguimiento_proxima_fecha: "2099-01-06",
    });

    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "negociacion",
      validacionPendiente: false,
    });

    expect(recomendacion.accion).toBe("Continuar gestión comercial");
    expect(recomendacion.motivo.toLowerCase()).toContain("ya registra seguimiento");
  });

  it("distingue diagnóstico pendiente de validación frente a diagnóstico validado", () => {
    const workflowPendiente = crearWorkflow({
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Validar diagnóstico",
      proxima_fecha: "2099-01-06",
      requiere_validacion: true,
      validacion_pendiente: true,
      tiene_cotizacion: false,
    });
    const workflowValidado = crearWorkflow({
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2099-01-06",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      validado_por: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
      fecha_validacion: "2099-01-05",
      tiene_cotizacion: false,
    });

    const recomendacionPendiente = recomendarAccionDesdeWorkflow({
      workflow: workflowPendiente,
      prioridad: "alta",
      estadoComercialReal: "sin_cotizar",
      validacionPendiente: true,
    });
    const recomendacionValidado = recomendarAccionDesdeWorkflow({
      workflow: workflowValidado,
      prioridad: "alta",
      estadoComercialReal: "sin_cotizar",
      validacionPendiente: false,
    });

    expect(recomendacionPendiente.accion).toBe("Validar diagnóstico humano");
    expect(recomendacionValidado.accion).toBe("Preparar cotización");
  });

  it("mantiene espera del cliente cuando la cotización ya fue emitida y la continuidad quedó en espera", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "esperando_cliente",
      proxima_accion: "Esperar respuesta del cliente",
      proxima_fecha: "2099-01-08",
      tiene_seguimiento: true,
      seguimiento_estado_comercial: "esperando_cliente",
      seguimiento_proximo_paso: "Esperar respuesta del cliente",
      seguimiento_proxima_fecha: "2099-01-08",
    });

    const sla = calcularEstadoSlaDesdeWorkflow({
      workflow,
      prioridad: "media",
      createdAt: "2099-01-01T00:00:00.000Z",
    });
    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "esperando_cliente",
      validacionPendiente: false,
    });

    expect(recomendacion.accion).toBe("Esperar respuesta del cliente");
    expect(sla.etiqueta).toBe("SLA en espera controlada");
  });

  it("mantiene SLA coherente con continuidad real cuando el caso está al día", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "negociacion",
      proxima_accion: "Llamar para cerrar definición",
      proxima_fecha: "2099-01-06",
      tiene_seguimiento: true,
      seguimiento_estado_comercial: "negociacion",
      seguimiento_proximo_paso: "Llamar para cerrar definición",
      seguimiento_proxima_fecha: "2099-01-06",
    });

    const sla = calcularEstadoSlaDesdeWorkflow({
      workflow,
      prioridad: "media",
      createdAt: "2099-01-01T00:00:00.000Z",
    });

    expect(workflow.alineacion.sla_vs_workflow).toBe("coherente");
    expect(sla.nivel).toBe("verde");
    expect(sla.descripcion.toLowerCase()).toContain("workflow");
  });

  it("no vence el SLA por parsear como UTC una fecha local sin hora", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T10:00:00-04:00"));

    const workflow = crearWorkflow({
      estado_comercial_real: "aprobado",
      proxima_accion: "Cerrar técnicamente el caso",
      proxima_fecha: "2026-04-07",
      tiene_logistica: true,
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2026-04-06",
      tiene_auditoria: true,
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2026-04-07",
      auditoria_fecha_cierre_tecnico: "2026-04-07",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
    });

    const sla = calcularEstadoSlaDesdeWorkflow({
      workflow,
      prioridad: "media",
      createdAt: "2026-04-02T03:12:06.515163+00:00",
    });

    expect(workflow.continuidad.estado).toBe("al_dia");
    expect(sla.etiqueta).not.toBe("SLA vencido");
    expect(sla.nivel).not.toBe("rojo");
  });

  it("no vuelve a preparar cotizacion cuando ya fue emitida y el caso quedo esperando respuesta", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "cotizado",
      proxima_accion: "Esperar a que el cliente responda",
      proxima_fecha: "2099-01-08",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      validado_por: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
      fecha_validacion: "2099-01-05",
      tiene_seguimiento: false,
    });

    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "cotizado",
      validacionPendiente: false,
    });

    expect(workflow.etapa_actual).toBe("cotizacion");
    expect(
      workflow.hitos.find((hito) => hito.codigo === "cotizacion_emitida")?.ocurrio
    ).toBe(true);
    expect(recomendacion.accion).toBe("Esperar respuesta del cliente");
  });

  it("recomienda registrar auditoría cuando el workflow ya deriva la continuidad de auditoría", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "aprobado",
      proxima_accion: "Confirmar entrega realizada",
      tiene_logistica: true,
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-05T10:00:00.000Z",
    });

    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "aprobado",
      validacionPendiente: false,
    });

    expect(workflow.etapa_actual).toBe("auditoria");
    expect(workflow.alineacion.continuidad_vs_workflow).toBe("alineada");
    expect(recomendacion.accion).toBe("Registrar resultado de auditoría");
    expect(recomendacion.motivo.toLowerCase()).toContain("cierre técnico");
  });

  it("recomienda abrir postventa cuando la auditoría quedó conforme", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "aprobado",
      proxima_accion: "Registrar seguimiento postventa",
      proxima_fecha: "2099-01-11",
      tiene_logistica: true,
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      tiene_cotizacion: true,
      tiene_seguimiento: true,
    });

    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "aprobado",
      validacionPendiente: false,
    });

    expect(workflow.etapa_actual).toBe("auditoria");
    expect(recomendacion.accion).toBe("Registrar seguimiento postventa");
  });

  it("recomienda cierre técnico cuando la postventa ya quedó resuelta", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "aprobado",
      proxima_accion: "Cerrar técnicamente el caso",
      proxima_fecha: "2099-01-14",
      tiene_logistica: true,
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      tiene_postventa: true,
      postventa_fecha: "2099-01-13",
      postventa_estado: "resuelta",
      postventa_responsable: "Postventa",
      postventa_requiere_accion: false,
      postventa_proxima_accion: "Cerrar técnicamente el caso",
      postventa_proxima_fecha: "2099-01-14",
      postventa_conformidad_final: true,
      workflow_transitions: [
        {
          id: "wf-postventa-1",
          transition_code: "postventa_abierta",
          from_stage: "auditoria",
          to_stage: "postventa",
          status: "resuelta",
          actor: "qa@test.com",
          origin: "test",
          occurred_at: "2099-01-12T00:00:00.000Z",
          observacion: "Postventa abierta",
          evidencia_ref: "post-1",
        },
      ],
    });

    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "aprobado",
      validacionPendiente: false,
    });

    expect(workflow.etapa_actual).toBe("postventa");
    expect(recomendacion.accion).toBe("Cerrar técnicamente el caso");
  });

  it("muestra narrativa final cuando el caso ya quedó técnicamente cerrado", () => {
    const workflow = crearWorkflow({
      estado_comercial_real: "aprobado",
      proxima_accion: null,
      proxima_fecha: null,
      tiene_logistica: true,
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      tiene_postventa: true,
      postventa_fecha: "2099-01-13",
      postventa_estado: "resuelta",
      postventa_responsable: "Postventa",
      postventa_requiere_accion: false,
      postventa_conformidad_final: true,
      tiene_cierre_tecnico: true,
      cierre_tecnico_fecha: "2099-01-14",
      cierre_tecnico_created_at: "2099-01-14T00:00:00.000Z",
      cierre_tecnico_responsable: "Operaciones",
      cierre_tecnico_motivo: "Caso finalizado",
      cierre_tecnico_postventa_resuelta: true,
      cierre_tecnico_requiere_postventa_adicional: false,
      workflow_transitions: [
        {
          id: "wf-postventa-1",
          transition_code: "postventa_abierta",
          from_stage: "auditoria",
          to_stage: "postventa",
          status: "resuelta",
          actor: "qa@test.com",
          origin: "test",
          occurred_at: "2099-01-12T00:00:00.000Z",
          observacion: "Postventa abierta",
          evidencia_ref: "post-1",
        },
        {
          id: "wf-cierre-1",
          transition_code: "cierre_tecnico_registrado",
          from_stage: "postventa",
          to_stage: "cierre_tecnico",
          status: "resuelta",
          actor: "ops@test.com",
          origin: "test",
          occurred_at: "2099-01-14T00:00:00.000Z",
          observacion: "Cierre técnico registrado",
          evidencia_ref: "cierre-1",
        },
      ],
    });

    const sla = calcularEstadoSlaDesdeWorkflow({
      workflow,
      prioridad: "media",
      createdAt: "2099-01-01T00:00:00.000Z",
    });
    const recomendacion = recomendarAccionDesdeWorkflow({
      workflow,
      prioridad: "media",
      estadoComercialReal: "aprobado",
      validacionPendiente: false,
    });

    expect(workflow.etapa_actual).toBe("cierre_tecnico");
    expect(workflow.continuidad.estado).toBe("cerrada");
    expect(sla.etiqueta).toBe("Caso técnicamente cerrado");
    expect(recomendacion.accion).toBe("Caso técnicamente cerrado");
    expect(recomendacion.fechaSugerida).toBeNull();
  });
});
