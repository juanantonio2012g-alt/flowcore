import { describe, expect, it } from "vitest";
import { normalizarDetalleCaso } from "./normalizarDetalleCaso";

describe("core/domain/casos/detalle/normalizarDetalleCaso", () => {
  it("consolida el detalle del caso en un estado global de lectura", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-1",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "cotizado",
          proxima_accion: "Dar seguimiento comercial",
          proxima_fecha: "2099-01-03T00:00:00.000Z",
          nivel_confianza_cliente: "media",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "alta",
          probabilidad_conversion: "media",
          observacion_relacional: "Caso bien encaminado",
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          tieneCotizacion: true,
          cotizacionEstado: "cotizado",
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "solicitud_recibida",
        descripcion_inicial: "Caso de prueba",
        canal_entrada: "whatsapp",
        tipo_solicitud: "diagnostico",
        responsable_actual: "Operaciones",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-1",
        cliente_nombre: "Cliente Uno",
        cliente_empresa: "Empresa Uno",
      },
      informe: {
        id: "informe-1",
        fecha_recepcion: null,
        resumen_tecnico: "Informe disponible",
        hallazgos_principales: null,
        estado_revision: "revisado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-1",
        problematica_identificada: "Problema",
        causa_probable: null,
        nivel_certeza: "alto",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: null,
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: null,
        created_at: "2099-01-01T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-1",
        fecha_cotizacion: null,
        solucion_asociada: null,
        productos_incluidos: null,
        cantidades: null,
        condiciones: null,
        observaciones: null,
        monto: null,
        estado: "cotizado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      seguimiento: null,
      logistica: null,
      bitacora: [],
    });

    expect(detalle.estadoGlobal.estado).toBe("cotizacion");
    expect(detalle.estadoGlobal.progreso.etapa_actual_label).toBe("Cotización");
    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("cotizacion");
    expect(detalle.resumen.cliente_contexto).toBe("Empresa Uno");
    expect(detalle.resumen.tipo_solicitud).toBe("diagnostico");
    expect(detalle.relacional.sintesis.label).toBe("Seguimiento con cautela");
    expect(detalle.relacional.sintesis.descripcion).toContain("vínculo mixto");
    expect(detalle.relacional.lectura_aplicada).toContain("Mantén seguimiento estructurado");
    expect(detalle.expediente.resumen.estado).toBe("incompleto");
    expect(detalle.expediente.resumen.porcentaje).toBe(50);
    expect(detalle.expediente.sintesis.modulos_formales_registrados).toBe(3);
    expect(detalle.expediente.sintesis.modulos_formales_totales).toBe(7);
    expect(detalle.expediente.sintesis.pendiente_principal).toBe("Evidencia del informe");
    expect(detalle.expediente.sintesis.pendiente_principal_tab).toBe("evidencia");
    expect(detalle.expediente.sintesis.asistencia_relacionada).toContain("No hay asistencia");
    expect(detalle.expediente.informe.estado).toBe("completo");
    expect(detalle.expediente.informe.visual.tipo).toBe("registrado");
    expect(detalle.expediente.evidencia.visual.tipo).toBe("incompleto");
    expect(detalle.expediente.cotizacion.visual.label).toBe("Registrada");
    expect(detalle.trazabilidad.alertas.length).toBeGreaterThan(0);
    expect(detalle.trazabilidad.alertas_agrupadas.length).toBeGreaterThan(0);
    expect(detalle.trazabilidad.sintesis.actividad_reciente).toBe("Cotización registrada");
    expect(detalle.ownership.responsable_humano).toBeNull();
    expect(detalle.ownership.responsable_humano_label).toBe("Sin asignar");
    expect(detalle.ownership.agente_operativo_activo).toBe("IA agent");
    expect(detalle.ownership.agente_ia_activo.codigo).toBe("ia-agent-comercial");
    expect(detalle.ownership.resumen.label).toBe("Ownership mínimo identificado");
    expect(detalle.ownership.activos.length).toBe(1);
    expect(detalle.metadata.origen).toBe("test-detalle");
  });

  it("muestra auditoria como etapa actual cuando la entrega ya se completó", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-auditoria",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "aprobado",
          proxima_accion: null,
          proxima_fecha: null,
          nivel_confianza_cliente: "alta",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "alta",
          probabilidad_conversion: "alta",
          observacion_relacional: null,
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          tieneCotizacion: true,
          tieneSeguimiento: true,
          workflowTransitions: [],
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "solucion_definida",
        descripcion_inicial: "Caso de auditoría",
        canal_entrada: "web",
        tipo_solicitud: "servicio",
        responsable_actual: "Administración",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-1",
        cliente_nombre: "Cliente Uno",
        cliente_empresa: "Empresa Uno",
      },
      informe: {
        id: "informe-1",
        fecha_recepcion: null,
        resumen_tecnico: "Informe disponible",
        hallazgos_principales: null,
        estado_revision: "revisado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-1",
        problematica_identificada: "Problema",
        causa_probable: null,
        nivel_certeza: "alto",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: null,
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: null,
        created_at: "2099-01-01T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-1",
        fecha_cotizacion: null,
        solucion_asociada: null,
        productos_incluidos: null,
        cantidades: null,
        condiciones: null,
        observaciones: null,
        monto: null,
        estado: "cotizado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      seguimiento: null,
      logistica: {
        id: "log-1",
        fecha_programada: "2099-01-09",
        responsable: "Operaciones",
        estado_logistico: "entregado",
        observacion_logistica: "Entrega confirmada",
        confirmacion_entrega: true,
        fecha_entrega: "2099-01-10",
        created_at: "2099-01-09T00:00:00.000Z",
      },
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("auditoria");
    expect(detalle.estadoGlobal.progreso.etapa_actual_label).toBe("Auditoría");
    expect(detalle.estadoGlobal.proxima_accion).toBe("Registrar resultado de auditoría");
    expect(detalle.estadoGlobal.proxima_fecha).toBe("2099-01-11");
  });

  it("calcula alineacion usando la proxima accion efectiva de continuidad en auditoria", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-auditoria-alineacion",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "aprobado",
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: "2099-01-06",
          nivel_confianza_cliente: "alta",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "alta",
          probabilidad_conversion: "alta",
          observacion_relacional: null,
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          tieneCotizacion: true,
          tieneSeguimiento: true,
          workflowTransitions: [],
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "solucion_definida",
        descripcion_inicial: "Caso de auditoría alineado",
        canal_entrada: "web",
        tipo_solicitud: "servicio",
        responsable_actual: "Administración",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-1",
        cliente_nombre: "Cliente Uno",
        cliente_empresa: "Empresa Uno",
      },
      informe: {
        id: "informe-1",
        fecha_recepcion: null,
        resumen_tecnico: "Informe disponible",
        hallazgos_principales: null,
        estado_revision: "revisado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-1",
        problematica_identificada: "Problema",
        causa_probable: null,
        nivel_certeza: "alto",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: null,
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: null,
        created_at: "2099-01-01T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-1",
        fecha_cotizacion: null,
        solucion_asociada: null,
        productos_incluidos: null,
        cantidades: null,
        condiciones: null,
        observaciones: null,
        monto: null,
        estado: "cotizado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      seguimiento: null,
      logistica: {
        id: "log-1",
        fecha_programada: "2099-01-09",
        responsable: "Operaciones",
        estado_logistico: "entregado",
        observacion_logistica: "Entrega confirmada",
        confirmacion_entrega: true,
        fecha_entrega: "2099-01-10",
        created_at: "2099-01-09T00:00:00.000Z",
      },
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("auditoria");
    expect(detalle.estadoGlobal.proxima_accion).toBe("Registrar resultado de auditoría");
    expect(detalle.estadoGlobal.alineacion_operativa.estado).toBe("alineada");
    expect(detalle.estadoGlobal.alineacion_operativa.label).toBe("Alineada");
  });

  it("no hereda la proxima_fecha anterior cuando ya está en etapa de auditoria", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-auditoria-fecha-heredada",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "aprobado",
          proxima_accion: "Coordinar ejecución o entrega",
          proxima_fecha: "2099-01-06",
          nivel_confianza_cliente: "alta",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "alta",
          probabilidad_conversion: "alta",
          observacion_relacional: null,
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          tieneCotizacion: true,
          tieneSeguimiento: true,
          workflowTransitions: [],
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "solucion_definida",
        descripcion_inicial: "Caso de auditoría",
        canal_entrada: "web",
        tipo_solicitud: "servicio",
        responsable_actual: "Administración",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-1",
        cliente_nombre: "Cliente Uno",
        cliente_empresa: "Empresa Uno",
      },
      informe: {
        id: "informe-1",
        fecha_recepcion: null,
        resumen_tecnico: "Informe disponible",
        hallazgos_principales: null,
        estado_revision: "revisado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-1",
        problematica_identificada: "Problema",
        causa_probable: null,
        nivel_certeza: "alto",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: null,
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: null,
        created_at: "2099-01-01T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-1",
        fecha_cotizacion: null,
        solucion_asociada: null,
        productos_incluidos: null,
        cantidades: null,
        condiciones: null,
        observaciones: null,
        monto: null,
        estado: "cotizado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      seguimiento: null,
      logistica: {
        id: "log-1",
        fecha_programada: "2099-01-09",
        responsable: "Operaciones",
        estado_logistico: "entregado",
        observacion_logistica: "Entrega confirmada",
        confirmacion_entrega: true,
        fecha_entrega: "2099-01-10",
        created_at: "2099-01-09T00:00:00.000Z",
      },
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("auditoria");
    expect(detalle.estadoGlobal.proxima_accion).toBe("Registrar resultado de auditoría");
    expect(detalle.estadoGlobal.proxima_fecha).toBe("2099-01-11");
    expect(detalle.trazabilidad.alertas.some((alerta) =>
      alerta.codigo === "proxima_fecha" && alerta.label.includes("2099-01-11")
    )).toBe(true);
  });

  it("no sugiere una cotizacion ejecutada cuando solo existe seguimiento en proceso", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-2",
          prioridad: "media",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "en_proceso",
          proxima_accion: null,
          proxima_fecha: null,
          nivel_confianza_cliente: "media",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "media",
          probabilidad_conversion: "media",
          observacion_relacional: null,
        },
        derivados: {
          tieneInforme: false,
          tieneDiagnostico: false,
          tieneCotizacion: false,
          cotizacionEstado: null,
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "seguimiento_comercial",
        descripcion_inicial: "Caso en seguimiento",
        canal_entrada: "whatsapp",
        tipo_solicitud: "seguimiento",
        responsable_actual: "Comercial",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: "comercial@test",
        cliente_id: "cliente-2",
        cliente_nombre: "Cliente Dos",
        cliente_empresa: "Empresa Dos",
      },
      informe: null,
      evidencias: [],
      diagnostico: null,
      diagnosticoAgente: null,
      cotizacion: null,
      seguimiento: {
        id: "seg-1",
        fecha: "2099-01-02",
        tipo_seguimiento: "llamada",
        resultado: "Cliente en evaluacion",
        proximo_paso: null,
        proxima_fecha: null,
        estado_comercial: "en_proceso",
        observaciones_cliente: null,
        created_at: "2099-01-02T00:00:00.000Z",
      },
      logistica: null,
      bitacora: [],
    });

    expect(detalle.expediente.cotizacion.visual.label).toBe("No registrada");
    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("gestion_comercial");
    expect(detalle.expediente.resumen.estado).toBe("incompleto");
    expect(detalle.expediente.resumen.porcentaje).toBeCloseTo(16.666666666666664);
    expect(detalle.expediente.sintesis.pendiente_principal).toBe("Informe técnico");
    expect(detalle.expediente.sintesis.pendiente_principal_tab).toBe("informe");
    expect(detalle.trazabilidad.sintesis.alerta_dominante).toContain("seguimiento comercial");
    expect(detalle.relacional.sintesis.label).toBe("Seguimiento con cautela");
    expect(detalle.relacional.lectura_aplicada).toContain("Confirma próxima acción y fecha");
    expect(
      detalle.trazabilidad.alertas.find(
        (alerta) => alerta.codigo === "seguimiento_en_proceso"
      )?.label
    ).toContain("todavía no registra una cotización");
    expect(detalle.ownership.activos).toEqual([
      {
        key: "creado_por",
        label: "Creado por",
        valor: "usuario@test",
      },
      {
        key: "seguimiento_por",
        label: "Seguimiento por",
        valor: "comercial@test",
      },
    ]);
    expect(detalle.ownership.responsable_humano).toBeNull();
    expect(detalle.ownership.responsable_humano_label).toBe("Sin asignar");
    expect(detalle.ownership.agente_operativo_activo).toBe("IA agent");
    expect(detalle.ownership.agente_ia_activo.codigo).toBe("ia-agent-tecnico");
  });

  it("combina validacion manual y derivada dentro del detalle del diagnostico", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-3",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_tecnico: "diagnosticado",
          estado_comercial: "sin_cotizar",
          proxima_accion: "Preparar cotización",
          proxima_fecha: "2099-01-04T00:00:00.000Z",
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
          tieneCotizacion: false,
        },
      },
      host: {
        estado_raw: "diagnosticado",
        descripcion_inicial: "Caso con diagnostico preliminar",
        canal_entrada: "correo",
        tipo_solicitud: "diagnostico",
        responsable_actual: "Técnico",
        creado_por: "usuario@test",
        diagnostico_por: "tecnico@test",
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-3",
        cliente_nombre: "Cliente Tres",
        cliente_empresa: "Empresa Tres",
      },
      informe: null,
      evidencias: [],
      diagnostico: {
        id: "diag-3",
        problematica_identificada: "Ingreso de humedad en muro interior",
        causa_probable: "Sellado deteriorado en junta",
        nivel_certeza: "medio",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: "Rehacer sellado y corregir ingreso de agua",
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: "2099-01-05",
        created_at: "2099-01-02T00:00:00.000Z",
      },
      diagnosticoAgente: {
        id: "agente-1",
        resumen_del_caso: "Caso con evidencia parcial",
        sintomas_clave: ["humedad"],
        categoria_probable: "grietas_fisuras",
        causa_probable: "Movimiento estructural",
        causas_alternativas: [],
        nivel_certeza: "medio",
        solucion_recomendada: "Validar con inspeccion complementaria",
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        riesgos_o_advertencias: [],
        requiere_validacion: true,
        requiere_escalamiento: false,
        estado_caso: "diagnosticado",
        caso_listo_para_cotizacion: false,
        estado_comercial: null,
        proximo_paso: null,
        suficiencia_de_evidencia: "media",
        riesgo_de_error: "medio",
        coincidencia_con_patron: "media_alta",
        necesidad_de_revision_humana: "obligatoria",
        fuente_agente: "heuristico_con_evidencias",
        version_prompt: "v1",
        version_modelo: "reglas",
        created_at: "2099-01-02T00:00:00.000Z",
      },
      cotizacion: null,
      seguimiento: null,
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("diagnostico");
    expect(
      detalle.estadoGlobal.workflow.hitos.find(
        (hito) => hito.codigo === "diagnostico_registrado"
      )?.ocurrio
    ).toBe(true);

    expect(detalle.estadoGlobal.metadata.requiere_validacion).toBe(true);
    expect(detalle.estadoGlobal.metadata.requiere_validacion_manual).toBe(false);
    expect(detalle.estadoGlobal.metadata.requiere_validacion_derivada).toBe(true);
    expect(detalle.estadoGlobal.metadata.validacion_pendiente).toBe(true);
    expect(detalle.estadoGlobal.metadata.validacion_resuelta).toBe(false);
    expect(detalle.expediente.diagnostico_humano.data?.requiere_validacion).toBe(true);
    expect(
      detalle.expediente.diagnostico_humano.data?.requiere_validacion_manual
    ).toBe(false);
    expect(
      detalle.expediente.diagnostico_humano.data?.requiere_validacion_derivada
    ).toBe(true);
    expect(
      detalle.expediente.diagnostico_humano.data?.validacion_pendiente
    ).toBe(true);
    expect(
      detalle.expediente.diagnostico_humano.data?.validacion_resuelta
    ).toBe(false);
    expect(
      detalle.expediente.diagnostico_humano.data?.motivos_validacion
    ).toContain("No existe informe técnico asociado.");
    expect(
      detalle.expediente.diagnostico_humano.data?.motivos_validacion
    ).toContain(
      "Existe desalineación entre la categoría humana y la categoría sugerida por el agente."
    );
    expect(
      detalle.trazabilidad.alertas.find(
        (alerta) => alerta.codigo === "validacion_diagnostico"
      )
    ).toBeTruthy();
  });

  it("muestra una validacion exitosa como resuelta en el detalle", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-4",
          prioridad: "media",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_tecnico: "diagnosticado",
          estado_comercial: "sin_cotizar",
          proxima_accion: "Preparar cotización",
          proxima_fecha: "2099-01-04T00:00:00.000Z",
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          requiereValidacion: false,
          diagnosticoRequiereValidacionManual: true,
          diagnosticoRequiereValidacionDerivada: false,
          diagnosticoMotivoValidacion: [],
          diagnosticoValidacionPendiente: false,
          diagnosticoValidacionResuelta: true,
          diagnosticoResultadoValidacion: "validado",
          diagnosticoValidadoPor: "validador@test.com",
          diagnosticoFechaValidacion: "2099-01-05",
        },
      },
      host: {
        estado_raw: "diagnosticado",
        descripcion_inicial: "Caso validado",
        canal_entrada: "correo",
        tipo_solicitud: "diagnostico",
        responsable_actual: "Técnico",
        creado_por: "usuario@test",
        diagnostico_por: "tecnico@test",
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-4",
        cliente_nombre: "Cliente Cuatro",
        cliente_empresa: "Empresa Cuatro",
      },
      informe: {
        id: "informe-4",
        fecha_recepcion: "2099-01-02",
        resumen_tecnico: "Informe consistente",
        hallazgos_principales: "Sin hallazgos contradictorios",
        estado_revision: "revisado",
        created_at: "2099-01-02T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-4",
        problematica_identificada: "Fisuras finas",
        causa_probable: "Movimiento térmico",
        nivel_certeza: "alto",
        categoria_caso: "grietas_fisuras",
        solucion_recomendada: "Sellado elástico",
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: true,
        requiere_validacion_manual: true,
        requiere_validacion_derivada: false,
        motivo_validacion: [],
        motivos_validacion: [],
        validacion_pendiente: false,
        validacion_resuelta: true,
        resultado_validacion: "validado",
        validado_por: "validador@test.com",
        observacion_validacion: "Criterio confirmado",
        fecha_validacion: "2099-01-05",
        created_at: "2099-01-02T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: null,
      seguimiento: null,
      bitacora: [],
    });

    expect(detalle.estadoGlobal.metadata.requiere_validacion).toBe(true);
    expect(detalle.estadoGlobal.metadata.validacion_pendiente).toBe(false);
    expect(detalle.estadoGlobal.metadata.validacion_resuelta).toBe(true);
    expect(detalle.estadoGlobal.metadata.resultado_validacion).toBe("validado");
    expect(detalle.expediente.diagnostico_humano.label).toBe("Validado");
    expect(detalle.expediente.diagnostico_humano.data?.validado_por).toBe(
      "validador@test.com"
    );
  });

  it("deja de priorizar preparar cotizacion cuando ya fue emitida y el caso espera respuesta del cliente", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-cotizado",
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
      },
      host: {
        estado_raw: "cotizado",
        descripcion_inicial: "Cotización emitida y en espera de respuesta",
        canal_entrada: "correo",
        tipo_solicitud: "cotizacion",
        responsable_actual: "Comercial",
        creado_por: "usuario@test",
        diagnostico_por: "tecnico@test",
        cotizacion_por: "comercial@test.com",
        seguimiento_por: null,
        cliente_id: "cliente-cotizado",
        cliente_nombre: "Cliente Cotizado",
        cliente_empresa: "Empresa Cotizada",
      },
      informe: {
        id: "informe-cotizado",
        fecha_recepcion: "2099-01-02",
        resumen_tecnico: "Informe técnico consistente",
        hallazgos_principales: "Sin conflictos",
        estado_revision: "revisado",
        created_at: "2099-01-02T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-cotizado",
        problematica_identificada: "Desprendimiento localizado",
        causa_probable: "Adherencia deficiente",
        nivel_certeza: "alto",
        categoria_caso: "acabados",
        solucion_recomendada: "Rehacer sistema de pintura interior",
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: true,
        requiere_validacion_manual: true,
        requiere_validacion_derivada: false,
        motivo_validacion: [],
        motivos_validacion: [],
        validacion_pendiente: false,
        validacion_resuelta: true,
        resultado_validacion: "validado",
        validado_por: "0d12f7fe-9b2f-4ef5-bf44-a8cf8b3ff001",
        observacion_validacion: "Criterio confirmado",
        fecha_validacion: "2099-01-05",
        created_at: "2099-01-03T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-cotizado",
        fecha_cotizacion: "2099-01-06",
        solucion_asociada: "Rehacer sistema de pintura interior",
        productos_incluidos: "Pintura interior",
        cantidades: "1 servicio",
        condiciones: "Condiciones estándar",
        observaciones: "En espera de respuesta",
        monto: 14000,
        estado: "pendiente",
        created_at: "2099-01-06T00:00:00.000Z",
      },
      seguimiento: null,
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("cotizacion");
    expect(detalle.estadoGlobal.recomendacion_operativa.accion).toBe(
      "Esperar respuesta del cliente"
    );
    expect(detalle.estadoGlobal.alineacion_operativa.estado).toBe("parcial");
    expect(detalle.estadoGlobal.alineacion_operativa.warning).toBeNull();
  });

  it("reconoce auditoria conforme y recomienda abrir postventa antes del cierre tecnico", () => {
    const detalle = normalizarDetalleCaso({
      caso: {
        caso: {
          id: "caso-detalle-auditoria-conforme",
          prioridad: "alta",
          created_at: "2099-01-01T00:00:00.000Z",
          estado_comercial: "aprobado",
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: "2099-01-06",
          nivel_confianza_cliente: "alta",
          nivel_friccion_cliente: "baja",
          desgaste_operativo: "bajo",
          claridad_intencion: "alta",
          probabilidad_conversion: "alta",
          observacion_relacional: null,
        },
        derivados: {
          tieneInforme: true,
          tieneDiagnostico: true,
          tieneCotizacion: true,
          tieneSeguimiento: true,
          workflowTransitions: [],
        },
        metadata: {
          origen: "test-detalle",
          timestamp: "2099-01-01T00:00:00.000Z",
        },
      },
      host: {
        estado_raw: "solucion_definida",
        descripcion_inicial: "Caso con auditoría conforme",
        canal_entrada: "web",
        tipo_solicitud: "servicio",
        responsable_actual: "Administración",
        creado_por: "usuario@test",
        diagnostico_por: null,
        cotizacion_por: null,
        seguimiento_por: null,
        cliente_id: "cliente-1",
        cliente_nombre: "Cliente Uno",
        cliente_empresa: "Empresa Uno",
      },
      informe: {
        id: "informe-1",
        fecha_recepcion: null,
        resumen_tecnico: "Informe disponible",
        hallazgos_principales: null,
        estado_revision: "revisado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      evidencias: [],
      diagnostico: {
        id: "diag-1",
        problematica_identificada: "Problema",
        causa_probable: null,
        nivel_certeza: "alto",
        categoria_caso: "humedad_filtracion",
        solucion_recomendada: null,
        producto_recomendado: null,
        proceso_sugerido: null,
        observaciones_tecnicas: null,
        requiere_validacion: false,
        fecha_validacion: null,
        created_at: "2099-01-01T00:00:00.000Z",
      },
      diagnosticoAgente: null,
      cotizacion: {
        id: "cot-1",
        fecha_cotizacion: null,
        solucion_asociada: null,
        productos_incluidos: null,
        cantidades: null,
        condiciones: null,
        observaciones: null,
        monto: null,
        estado: "cotizado",
        created_at: "2099-01-01T00:00:00.000Z",
      },
      seguimiento: null,
      logistica: {
        id: "log-1",
        fecha_programada: "2099-01-09",
        responsable: "Operaciones",
        estado_logistico: "entregado",
        observacion_logistica: "Entrega confirmada",
        confirmacion_entrega: true,
        fecha_entrega: "2099-01-10",
        created_at: "2099-01-09T00:00:00.000Z",
      },
      auditoria: {
        id: "aud-1",
        caso_id: "caso-detalle-auditoria-conforme",
        fecha_auditoria: "2099-01-11",
        responsable_auditoria: "QA",
        estado_auditoria: "conforme",
        observaciones_auditoria: "Auditoría conforme",
        conformidad_cliente: true,
        requiere_correccion: false,
        fecha_cierre_tecnico: "2099-01-11",
        created_at: "2099-01-11T00:00:00.000Z",
      },
      bitacora: [],
    });

    expect(detalle.estadoGlobal.workflow.etapa_actual).toBe("auditoria");
    expect(detalle.estadoGlobal.workflow.auditoria.estado_auditoria).toBe("conforme");
    expect(detalle.estadoGlobal.workflow.auditoria.fecha_auditoria).toBe("2099-01-11");
    expect(detalle.estadoGlobal.workflow.continuidad.estado).toBe("al_dia");
    expect(detalle.estadoGlobal.workflow.continuidad.proxima_accion).toBe("Registrar seguimiento postventa");
    expect(detalle.estadoGlobal.recomendacion_operativa.accion).toBe("Registrar seguimiento postventa");
    expect(detalle.estadoGlobal.proxima_accion).toBe("Registrar seguimiento postventa");
  });
});
