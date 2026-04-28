import { describe, expect, it } from "vitest";
import { normalizarCaso } from "./normalizarCaso";

describe("core/domain/casos/normalizarCaso", () => {
  it("mantiene alineado el arranque de un caso nuevo cuando nace con continuidad inicial formal", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-nuevo-alineado",
        prioridad: "media",
        created_at: "2099-01-01T00:00:00.000Z",
        proxima_accion: "Registrar informe técnico",
        proxima_fecha: "2099-01-02",
      },
      derivados: {
        tieneInforme: false,
        tieneDiagnostico: false,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      },
    });

    expect(caso.workflow.etapa_actual).toBe("informe");
    expect(caso.workflow.continuidad.estado).toBe("al_dia");
    expect(caso.workflow.continuidad.proxima_accion).toBe(
      "Registrar informe técnico"
    );
    expect(caso.workflow.alineacion.continuidad_vs_workflow).toBe("alineada");
    expect(caso.recomendacion_operativa.accion).toBe(
      "Registrar informe técnico"
    );
    expect(caso.proxima_accion).toBe("Registrar informe técnico");
    expect(caso.macroarea_actual).toBe("tecnico");
  });

  it("expone un contrato estable de lectura para OpenCore", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-fase-1",
        prioridad: "alta",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_comercial: "cotizado",
        proxima_accion: "Dar seguimiento comercial",
        proxima_fecha: "2099-01-03T00:00:00.000Z",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        cotizacionEstado: "cotizado",
        tieneSeguimiento: false,
      },
      metadata: {
        origen: "test-host",
        timestamp: "2099-01-01T00:00:00.000Z",
      },
    });

    expect(caso.id).toBe("caso-fase-1");
    expect(caso.estado).toBe("cotizacion");
    expect(caso.estado_label).toBe("Cotización");
    expect(caso.macroarea_actual).toBe("comercial");
    expect(caso.macroarea_label).toBe("Comercial");
    expect(caso.macroarea_orden).toBeGreaterThanOrEqual(0);
    expect(caso.riesgo).toBe("bajo");
    expect(caso.proxima_accion).toBe("Dar seguimiento comercial");
    expect(caso.recomendacion_operativa.accion).toBe("Dar seguimiento comercial");
    expect(caso.sla.etiqueta).toBe("SLA en tiempo");
    expect(caso.workflow.etapa_actual).toBe("cotizacion");
    expect(caso.workflow.continuidad.proxima_accion).toBe(
      "Dar seguimiento comercial"
    );
    expect(caso.metadata.origen).toBe("test-host");
    expect(caso.metadata.requiere_validacion).toBe(false);
    expect(caso.metadata.requiere_validacion_manual).toBe(false);
    expect(caso.metadata.requiere_validacion_derivada).toBe(false);
    expect(caso.metadata.motivo_validacion).toEqual([]);
    expect(caso.metadata.validacion_pendiente).toBe(false);
    expect(caso.metadata.validacion_resuelta).toBe(false);
  });

  it("expone el desglose manual y derivado de validacion en metadata", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-fase-2",
        prioridad: "media",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "diagnosticado",
      },
      derivados: {
        tieneInforme: false,
        tieneDiagnostico: true,
        requiereValidacion: true,
        diagnosticoRequiereValidacionManual: false,
        diagnosticoRequiereValidacionDerivada: true,
        diagnosticoMotivoValidacion: [
          "Nivel de certeza medio o menor.",
          "No existe informe técnico asociado.",
        ],
      },
    });

    expect(caso.estado).toBe("validacion");
    expect(caso.metadata.requiere_validacion).toBe(true);
    expect(caso.metadata.requiere_validacion_manual).toBe(false);
    expect(caso.metadata.requiere_validacion_derivada).toBe(true);
    expect(caso.metadata.motivo_validacion).toContain(
      "No existe informe técnico asociado."
    );
    expect(caso.metadata.validacion_pendiente).toBe(true);
    expect(caso.metadata.validacion_resuelta).toBe(false);
    expect(caso.recomendacion_operativa.accion).toBe(
      "Validar diagnóstico humano"
    );
    expect(caso.workflow.etapa_actual).toBe("diagnostico");
    expect(caso.workflow.hitos.find((hito) => hito.codigo === "diagnostico_registrado")?.ocurrio).toBe(true);
  });

  it("distingue validacion requerida de validacion pendiente cuando el diagnostico ya fue validado", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-validado",
        prioridad: "alta",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "diagnosticado",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        requiereValidacion: false,
        diagnosticoRequiereValidacionManual: true,
        diagnosticoRequiereValidacionDerivada: false,
        diagnosticoValidacionPendiente: false,
        diagnosticoValidacionResuelta: true,
        diagnosticoResultadoValidacion: "validado",
        diagnosticoValidadoPor: "tecnico@test.com",
        diagnosticoFechaValidacion: "2099-01-05",
      },
    });

    expect(caso.metadata.requiere_validacion).toBe(true);
    expect(caso.metadata.validacion_pendiente).toBe(false);
    expect(caso.metadata.validacion_resuelta).toBe(true);
    expect(caso.metadata.resultado_validacion).toBe("validado");
    expect(caso.recomendacion_operativa.accion).toBe("Preparar cotización");
    expect(caso.workflow.hitos.find((hito) => hito.codigo === "diagnostico_validado")?.ocurrio).toBe(true);
  });

  it("prioriza la espera del cliente cuando la cotizacion ya fue emitida y la validacion ya no esta pendiente", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-cotizado-espera",
        prioridad: "media",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "diagnosticado",
        estado_comercial: "cotizado",
        proxima_accion: "Esperar a que el cliente responda",
        proxima_fecha: "2099-01-08T00:00:00.000Z",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        diagnosticoRequiereValidacionManual: true,
        diagnosticoRequiereValidacionDerivada: false,
        diagnosticoValidacionPendiente: false,
        diagnosticoValidacionResuelta: true,
        diagnosticoResultadoValidacion: "validado",
        diagnosticoValidadoPor: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
        diagnosticoFechaValidacion: "2099-01-05",
        workflowTransitions: [
          {
            id: "wf-diag-1",
            transition_code: "diagnostico_validado",
            from_stage: "diagnostico",
            to_stage: "diagnostico",
            status: "resuelta",
            actor: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
            origin: "test",
            occurred_at: "2099-01-05T00:00:00.000Z",
            observacion: null,
            evidencia_ref: "diag-1",
          },
          {
            id: "wf-cot-1",
            transition_code: "cotizacion_emitida",
            from_stage: "cotizacion",
            to_stage: "cotizacion",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-06T00:00:00.000Z",
            observacion: null,
            evidencia_ref: "cot-1",
          },
        ],
      },
    });

    expect(caso.workflow.etapa_actual).toBe("cotizacion");
    expect(caso.metadata.validacion_pendiente).toBe(false);
    expect(caso.recomendacion_operativa.accion).toBe(
      "Esperar respuesta del cliente"
    );
  });

  it("narra cierre sin conversion cuando existen cliente_rechazo y cierre_sin_conversion", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-cerrado-rechazo",
        prioridad: "media",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "solucion_definida",
        estado_comercial: "rechazado",
        proxima_accion: "Confirmar cierre del caso",
        proxima_fecha: "2099-01-08T00:00:00.000Z",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
        workflowTransitions: [
          {
            id: "wf-cot-1",
            transition_code: "cotizacion_emitida",
            from_stage: "cotizacion",
            to_stage: "cotizacion",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-06T00:00:00.000Z",
            observacion: null,
            evidencia_ref: "cot-1",
          },
          {
            id: "wf-rechazo-1",
            transition_code: "cliente_rechazo",
            from_stage: "gestion_comercial",
            to_stage: "gestion_comercial",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-07T00:00:00.000Z",
            observacion: "Cliente no acepta propuesta",
            evidencia_ref: "seg-1",
          },
          {
            id: "wf-cierre-1",
            transition_code: "cierre_sin_conversion",
            from_stage: "gestion_comercial",
            to_stage: "cerrado",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-07T00:01:00.000Z",
            observacion: "Cierre consolidado",
            evidencia_ref: "seg-1",
          },
        ],
      },
    });

    expect(caso.workflow.etapa_actual).toBe("cerrado");
    expect(caso.workflow.cierre?.resultado_final).toBe("cerrado_sin_conversion");
    expect(caso.recomendacion_operativa.accion).toBe("Confirmar cierre del caso");
  });

  it("entra a logistica_entrega y cambia la narrativa cuando existe cliente_aprobo", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-aprobado",
        prioridad: "alta",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "solucion_definida",
        estado_comercial: "aprobado",
        proxima_accion: "Coordinar ejecución o entrega",
        proxima_fecha: "2099-01-10T00:00:00.000Z",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
        workflowTransitions: [
          {
            id: "wf-cot-1",
            transition_code: "cotizacion_emitida",
            from_stage: "cotizacion",
            to_stage: "cotizacion",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-06T00:00:00.000Z",
            observacion: null,
            evidencia_ref: "cot-1",
          },
          {
            id: "wf-apr-1",
            transition_code: "cliente_aprobo",
            from_stage: "gestion_comercial",
            to_stage: "logistica_entrega",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-07T00:00:00.000Z",
            observacion: "Cliente aprueba propuesta",
            evidencia_ref: "seg-1",
          },
        ],
      },
    });

    expect(caso.workflow.etapa_actual).toBe("logistica_entrega");
    expect(
      caso.workflow.hitos.find((hito) => hito.codigo === "cliente_aprobo")?.ocurrio
    ).toBe(true);
    expect(caso.recomendacion_operativa.accion).toBe("Confirmar programación");
  });

  it("ajusta la narrativa logística cuando la entrega ya está programada", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-logistica-programada",
        prioridad: "alta",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "solucion_definida",
        estado_comercial: "aprobado",
        proxima_accion: null,
        proxima_fecha: null,
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
        tieneLogistica: true,
        logisticaCreatedAt: "2099-01-08T00:00:00.000Z",
        logisticaFechaProgramada: "2099-01-10",
        logisticaResponsable: "Operaciones",
        logisticaEstado: "programado",
        workflowTransitions: [
          {
            id: "wf-apr-1",
            transition_code: "cliente_aprobo",
            from_stage: "gestion_comercial",
            to_stage: "logistica_entrega",
            status: "resuelta",
            actor: "comercial@test.com",
            origin: "test",
            occurred_at: "2099-01-07T00:00:00.000Z",
            observacion: null,
            evidencia_ref: "seg-1",
          },
        ],
      },
    });

    expect(caso.workflow.etapa_actual).toBe("logistica_entrega");
    expect(caso.workflow.logistica?.estado_logistico).toBe("programado");
    expect(caso.proxima_accion).toBe("Coordinar ejecución o entrega");
    expect(caso.recomendacion_operativa.accion).toBe("Ejecutar entrega");
  });

  it("marca el estado global como cerrado cuando existe cierre técnico formal", () => {
    const caso = normalizarCaso({
      caso: {
        id: "caso-cierre-tecnico",
        prioridad: "media",
        created_at: "2099-01-01T00:00:00.000Z",
        estado_tecnico: "solucion_definida",
        estado_comercial: "aprobado",
        proxima_accion: "Coordinar ejecución o entrega",
        proxima_fecha: "2099-01-10",
      },
      derivados: {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
        tieneLogistica: true,
        logisticaEstado: "entregado",
        logisticaFechaEntrega: "2099-01-10T00:00:00.000Z",
        auditoriaCreatedAt: "2099-01-11T00:00:00.000Z",
        auditoriaEstado: "conforme",
        auditoriaFechaAuditoria: "2099-01-11",
        auditoriaConformidadCliente: true,
        auditoriaRequiereCorreccion: false,
        tienePostventa: true,
        postventaCreatedAt: "2099-01-12T00:00:00.000Z",
        postventaEstado: "resuelta",
        postventaConformidadFinal: true,
        postventaRequiereAccion: false,
        workflowTransitions: [
          {
            id: "wf-cierre-1",
            transition_code: "cierre_tecnico_registrado",
            from_stage: "postventa",
            to_stage: "cierre_tecnico",
            status: "resuelta",
            actor: "ops@test.com",
            origin: "test",
            occurred_at: "2099-01-13T00:00:00.000Z",
            observacion: "Cierre técnico registrado",
            evidencia_ref: null,
          },
        ],
      },
    });

    expect(caso.workflow.etapa_actual).toBe("cierre_tecnico");
    expect(caso.workflow.estado_workflow).toBe("cerrado");
    expect(caso.estado).toBe("cerrado");
    expect(caso.estado_label).toBe("Caso cerrado");
    expect(caso.proxima_accion).toBeNull();
    expect(caso.proxima_fecha).toBeNull();
  });
});
