import { describe, expect, it } from "vitest";
import { derivarWorkflowDelCaso } from "./workflow";

describe("core/domain/casos/workflow", () => {
  it("deriva la etapa actual desde el núcleo técnico-comercial soportado", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-gestion",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "negociacion",
      proxima_accion: "Esperar respuesta del cliente",
      proxima_fecha: "2099-01-10",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      seguimiento_estado_comercial: "negociacion",
      seguimiento_proximo_paso: "Esperar respuesta del cliente",
      seguimiento_proxima_fecha: "2099-01-10",
      responsable_actual: "Comercial",
    });

    expect(workflow.etapa_actual).toBe("gestion_comercial");
    expect(workflow.estado_workflow).toBe("activo");
    expect(workflow.continuidad.owner_actual).toBe("comercial");
    expect(
      workflow.etapas.find((etapa) => etapa.etapa === "cotizacion")?.estado
    ).toBe("completada");
  });

  it("deriva hitos principales de validación y resolución comercial desde el estado actual", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-hitos",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: "Coordinar entrega",
      proxima_fecha: "2099-01-12",
      sla_nivel: "verde",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      validado_por: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
      fecha_validacion: "2099-01-06",
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-07T00:00:00.000Z",
      responsable_actual: "Administración",
    });

    expect(
      workflow.hitos.find((hito) => hito.codigo === "diagnostico_validado")
    ).toMatchObject({
      ocurrio: true,
      fecha: "2099-01-06",
      actor: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
    });
    expect(
      workflow.hitos.find((hito) => hito.codigo === "cliente_aprobo")?.ocurrio
    ).toBe(true);
    expect(workflow.etapa_actual).toBe("logistica_entrega");
    expect(workflow.transiciones.actual?.key).toBe("gestion_comercial_a_logistica");
    expect(workflow.transiciones.actual?.estado).toBe("resuelta");
  });

  it("deriva auditoria tras la entrega realizada y mantiene continuidad pendiente", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-auditoria",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: null,
      proxima_fecha: null,
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-06T00:00:00.000Z",
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      responsable_actual: "Administración",
    });

    expect(workflow.etapa_actual).toBe("auditoria");
    expect(workflow.auditoria).toEqual({
      estado_auditoria: "pendiente",
      fecha_auditoria: null,
      responsable_auditoria: null,
      observaciones_auditoria: null,
      conformidad_cliente: null,
      requiere_correccion: false,
      fecha_cierre_tecnico: null,
    });
    expect(workflow.continuidad.estado).toBe("pendiente");
    expect(workflow.continuidad.proxima_accion).toBe("Registrar resultado de auditoría");
    expect(workflow.continuidad.proxima_fecha).toBe("2099-01-11");
    expect(workflow.alineacion.continuidad_vs_workflow).not.toBe("vencida");
  });

  it("ignora proxima_fecha heredada de la etapa previa cuando el caso ya está en auditoria", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-auditoria-fecha-heredada",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: "Coordinar ejecución o entrega",
      proxima_fecha: "2099-01-06",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-06T00:00:00.000Z",
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      responsable_actual: "Administración",
    });

    expect(workflow.etapa_actual).toBe("auditoria");
    expect(workflow.continuidad.proxima_accion).toBe("Registrar resultado de auditoría");
    expect(workflow.continuidad.proxima_fecha).toBe("2099-01-11");
  });

  it("abre postventa como etapa formal después de una auditoría conforme cuando ya existe registro persistido", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-postventa",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: "Dar seguimiento postventa",
      proxima_fecha: "2099-01-13",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-06T00:00:00.000Z",
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_created_at: "2099-01-11T00:00:00.000Z",
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_responsable: "QA",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      tiene_postventa: true,
      postventa_created_at: "2099-01-12T00:00:00.000Z",
      postventa_fecha: "2099-01-12",
      postventa_estado: "en_seguimiento",
      postventa_responsable: "Postventa",
      postventa_observacion: "Seguimiento posterior activo",
      postventa_requiere_accion: false,
      postventa_proxima_accion: "Dar seguimiento postventa",
      postventa_proxima_fecha: "2099-01-13",
      postventa_conformidad_final: false,
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
      responsable_actual: "Administración",
    });

    expect(workflow.etapa_actual).toBe("postventa");
    expect(workflow.postventa?.estado_postventa).toBe("en_seguimiento");
    expect(workflow.continuidad.proxima_accion).toBe("Dar seguimiento postventa");
    expect(workflow.transiciones.actual?.key).toBe("postventa_a_cierre_tecnico");
  });

  it("habilita cierre técnico cuando la postventa queda resuelta sin pendientes", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-postventa-resuelta",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: "Cerrar técnicamente el caso",
      proxima_fecha: "2099-01-14",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-06T00:00:00.000Z",
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_created_at: "2099-01-11T00:00:00.000Z",
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_responsable: "QA",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      tiene_postventa: true,
      postventa_created_at: "2099-01-12T00:00:00.000Z",
      postventa_fecha: "2099-01-13",
      postventa_estado: "resuelta",
      postventa_responsable: "Postventa",
      postventa_observacion: "Cliente conforme",
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
        {
          id: "wf-postventa-2",
          transition_code: "cierre_tecnico_habilitado",
          from_stage: "postventa",
          to_stage: "cierre_tecnico",
          status: "resuelta",
          actor: "postventa@test.com",
          origin: "test",
          occurred_at: "2099-01-13T00:00:00.000Z",
          observacion: "Listo para cierre técnico",
          evidencia_ref: "post-1",
        },
      ],
      responsable_actual: "Administración",
    });

    expect(workflow.etapa_actual).toBe("postventa");
    expect(workflow.continuidad.proxima_accion).toBe("Cerrar técnicamente el caso");
    expect(workflow.transiciones.actual?.key).toBe("postventa_a_cierre_tecnico");
    expect(workflow.transiciones.actual?.estado).toBe("habilitada");
  });

  it("formaliza cierre técnico como etapa final y cierra la continuidad operativa", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-cierre-tecnico",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: null,
      proxima_fecha: null,
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-06T00:00:00.000Z",
      logistica_estado: "entregado",
      logistica_confirmacion_entrega: true,
      logistica_fecha_entrega: "2099-01-10",
      tiene_auditoria: true,
      auditoria_created_at: "2099-01-11T00:00:00.000Z",
      auditoria_estado: "conforme",
      auditoria_fecha_auditoria: "2099-01-11",
      auditoria_responsable: "QA",
      auditoria_conformidad_cliente: true,
      auditoria_requiere_correccion: false,
      auditoria_fecha_cierre_tecnico: "2099-01-11",
      tiene_postventa: true,
      postventa_created_at: "2099-01-12T00:00:00.000Z",
      postventa_fecha: "2099-01-13",
      postventa_estado: "resuelta",
      postventa_responsable: "Postventa",
      postventa_requiere_accion: false,
      postventa_proxima_accion: "Cerrar técnicamente el caso",
      postventa_proxima_fecha: "2099-01-14",
      postventa_conformidad_final: true,
      tiene_cierre_tecnico: true,
      cierre_tecnico_created_at: "2099-01-14T00:00:00.000Z",
      cierre_tecnico_fecha: "2099-01-14",
      cierre_tecnico_responsable: "Operaciones",
      cierre_tecnico_motivo: "Caso finalizado",
      cierre_tecnico_observacion: "Sin pendientes",
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
          id: "wf-postventa-2",
          transition_code: "cierre_tecnico_habilitado",
          from_stage: "postventa",
          to_stage: "cierre_tecnico",
          status: "resuelta",
          actor: "postventa@test.com",
          origin: "test",
          occurred_at: "2099-01-13T00:00:00.000Z",
          observacion: "Listo para cierre técnico",
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
      responsable_actual: "Operaciones",
    });

    expect(workflow.etapa_actual).toBe("cierre_tecnico");
    expect(workflow.estado_workflow).toBe("cerrado");
    expect(workflow.continuidad.estado).toBe("cerrada");
    expect(workflow.continuidad.proxima_accion).toBeNull();
    expect(workflow.cierre_tecnico?.fecha_cierre_tecnico).toBe("2099-01-14");
    expect(workflow.transiciones.actual?.estado).toBe("resuelta");
  });

  it("separa continuidad operativa de la etapa estructural y detecta continuidad vencida", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-vencido",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "cotizado",
      proxima_accion: "Dar seguimiento comercial",
      proxima_fecha: "2000-01-02",
      sla_nivel: "rojo",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      responsable_actual: "Comercial",
    });

    expect(workflow.etapa_actual).toBe("cotizacion");
    expect(workflow.continuidad.estado).toBe("vencida");
    expect(workflow.alineacion.continuidad_vs_workflow).toBe("vencida");
  });

  it("detecta desalineación cuando hay continuidad comercial sin cotización estructural", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-desalineado",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "informe_recibido",
      estado_comercial_real: "en_proceso",
      proxima_accion: "Dar seguimiento comercial",
      proxima_fecha: "2099-01-08",
      sla_nivel: "amarillo",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: false,
      tiene_cotizacion: false,
      tiene_seguimiento: false,
      responsable_actual: "Comercial",
    });

    expect(workflow.etapa_actual).toBe("gestion_comercial");
    expect(workflow.alineacion.expediente_vs_workflow).toBe("atrasado");
    expect(workflow.alineacion.continuidad_vs_workflow).toBe("desfasada");
    expect(workflow.alineacion.sla_vs_workflow).toBe("inconsistente");
    expect(workflow.alineacion.alertas).toContain(
      "El workflow comercial avanza, pero todavía no existe una cotización formal que respalde esa etapa."
    );
  });

  it("mantiene compatibilidad con casos parciales que apenas están en solicitud", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-parcial",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solicitud_recibida",
      estado_comercial_real: "sin_cotizar",
      proxima_accion: null,
      proxima_fecha: null,
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: false,
      tiene_diagnostico: false,
      tiene_cotizacion: false,
      tiene_seguimiento: false,
    });

    expect(workflow.etapa_actual).toBe("solicitud");
    expect(workflow.continuidad.estado).toBe("pendiente");
    expect(
      workflow.etapas.find((etapa) => etapa.etapa === "solicitud")?.estado
    ).toBe("actual");
    expect(
      workflow.hitos.find((hito) => hito.codigo === "informe_registrado")?.ocurrio
    ).toBe(false);
  });

  it("habilita estructuralmente la cotización cuando el diagnóstico ya quedó validado", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-cotizable",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      validado_por: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
      fecha_validacion: "2099-01-06",
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: false,
      tiene_seguimiento: false,
      responsable_actual: "Técnico",
    });

    const transicion = workflow.transiciones.lista.find(
      (item) => item.key === "diagnostico_a_cotizacion"
    );

    expect(transicion?.estado).toBe("habilitada");
    expect(transicion?.bloqueos).toEqual([]);
    expect(transicion?.habilitadores).toContain(
      "El diagnóstico ya fue validado formalmente."
    );
  });

  it("mantiene bloqueada la transición a cotización cuando el diagnóstico quedó observado o rechazado", () => {
    const observado = derivarWorkflowDelCaso({
      caso_id: "caso-observado",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Revisar diagnóstico",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: true,
      validacion_pendiente: true,
      validacion_resuelta: false,
      resultado_validacion: "observado",
      fecha_validacion: "2099-01-06",
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: false,
      tiene_seguimiento: false,
    });
    const rechazado = derivarWorkflowDelCaso({
      caso_id: "caso-rechazado",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Reformular diagnóstico",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "rechazado",
      fecha_validacion: "2099-01-06",
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: false,
      tiene_seguimiento: false,
    });

    const transicionObservada = observado.transiciones.lista.find(
      (item) => item.key === "diagnostico_a_cotizacion"
    );
    const transicionRechazada = rechazado.transiciones.lista.find(
      (item) => item.key === "diagnostico_a_cotizacion"
    );

    expect(transicionObservada?.estado).toBe("bloqueada");
    expect(transicionObservada?.bloqueos).toContain(
      "El diagnóstico quedó observado y necesita revisión adicional antes de cotizar."
    );
    expect(transicionRechazada?.estado).toBe("bloqueada");
    expect(transicionRechazada?.bloqueos).toContain(
      "El diagnóstico fue rechazado por validación técnica y bloquea el avance a cotización."
    );
  });

  it("resuelve la transición de cotización a gestión comercial cuando ya existe gestión visible", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-comercial",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "negociacion",
      proxima_accion: "Continuar gestión comercial",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      seguimiento_estado_comercial: "negociacion",
    });

    const transicion = workflow.transiciones.lista.find(
      (item) => item.key === "cotizacion_a_gestion_comercial"
    );

    expect(transicion?.estado).toBe("resuelta");
    expect(transicion?.efectiva).toBe(true);
  });

  it("formaliza el cierre sin conversión cuando el cliente rechazó el caso", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-cierre",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "rechazado",
      proxima_accion: "Revisar cierre del caso",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      seguimiento_estado_comercial: "rechazado",
    });

    const transicion = workflow.transiciones.lista.find(
      (item) => item.key === "gestion_comercial_a_cierre"
    );

    expect(workflow.etapa_actual).toBe("cerrado");
    expect(transicion?.estado).toBe("resuelta");
    expect(transicion?.resultado).toContain("cerró estructuralmente sin conversión");
  });

  it("refuerza hitos y transición desde transiciones persistidas aunque el snapshot todavía no refleje todo", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-persistido",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: null,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: false,
      tiene_seguimiento: false,
      workflow_transitions: [
        {
          id: "wf-1",
          transition_code: "diagnostico_validado",
          from_stage: "diagnostico",
          to_stage: "diagnostico",
          status: "resuelta",
          actor: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
          origin: "opencore.expediente.diagnostico.validacion",
          occurred_at: "2099-01-06T00:00:00.000Z",
          observacion: "Criterio confirmado",
          evidencia_ref: "diag-1",
        },
      ],
    });

    expect(
      workflow.hitos.find((hito) => hito.codigo === "diagnostico_validado")
    ).toMatchObject({
      ocurrio: true,
      origen: "workflow",
      actor: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
    });
    expect(
      workflow.transiciones.lista.find(
        (item) => item.key === "diagnostico_a_cotizacion"
      )?.estado
    ).toBe("habilitada");
    expect(workflow.metadata.ultima_transicion_at).toBe("2099-01-06T00:00:00.000Z");
  });

  it("usa cierre_sin_conversion persistido para consolidar cierre aunque el estado comercial todavía no se haya sincronizado", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-cierre-persistido",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "negociacion",
      proxima_accion: "Revisar cierre del caso",
      proxima_fecha: "2099-01-08",
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      workflow_transitions: [
        {
          id: "wf-2",
          transition_code: "cliente_rechazo",
          from_stage: "gestion_comercial",
          to_stage: "gestion_comercial",
          status: "resuelta",
          actor: "comercial@test.com",
          origin: "opencore.expediente.seguimiento",
          occurred_at: "2099-01-07T00:00:00.000Z",
          observacion: "Cliente no acepta propuesta",
          evidencia_ref: "seg-1",
        },
        {
          id: "wf-3",
          transition_code: "cierre_sin_conversion",
          from_stage: "gestion_comercial",
          to_stage: "cerrado",
          status: "resuelta",
          actor: "comercial@test.com",
          origin: "opencore.expediente.seguimiento",
          occurred_at: "2099-01-07T00:01:00.000Z",
          observacion: "Cierre consolidado",
          evidencia_ref: "seg-1",
        },
      ],
    });

    expect(workflow.etapa_actual).toBe("cerrado");
    expect(workflow.cierre?.resultado_final).toBe("cerrado_sin_conversion");
    expect(
      workflow.transiciones.lista.find(
        (item) => item.key === "gestion_comercial_a_cierre"
      )?.estado
    ).toBe("resuelta");
  });

  it("abre hitos y continuidad logística cuando ya existe programación de entrega", () => {
    const workflow = derivarWorkflowDelCaso({
      caso_id: "caso-logistica",
      created_at: "2099-01-01T00:00:00.000Z",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      proxima_accion: null,
      proxima_fecha: null,
      sla_nivel: "verde",
      requiere_validacion: false,
      tiene_informe: true,
      informe_created_at: "2099-01-02T00:00:00.000Z",
      tiene_diagnostico: true,
      diagnostico_created_at: "2099-01-03T00:00:00.000Z",
      tiene_cotizacion: true,
      cotizacion_created_at: "2099-01-04T00:00:00.000Z",
      tiene_seguimiento: true,
      seguimiento_created_at: "2099-01-05T00:00:00.000Z",
      tiene_logistica: true,
      logistica_created_at: "2099-01-08T00:00:00.000Z",
      logistica_fecha_programada: "2099-01-10",
      logistica_responsable: "Operaciones",
      logistica_estado: "programado",
      logistica_confirmacion_entrega: false,
    });

    expect(workflow.etapa_actual).toBe("logistica_entrega");
    expect(workflow.logistica?.estado_logistico).toBe("programado");
    expect(workflow.continuidad.proxima_accion).toBe("Coordinar ejecución o entrega");
    expect(workflow.continuidad.origen).toBe("workflow");
    expect(
      workflow.hitos.find((hito) => hito.codigo === "entrega_programada")?.ocurrio
    ).toBe(true);
    expect(
      workflow.etapas.find((etapa) => etapa.etapa === "logistica_entrega")?.soportada
    ).toBe(true);
  });
});
