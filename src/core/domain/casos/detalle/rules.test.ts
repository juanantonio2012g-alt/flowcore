import { describe, expect, it } from "vitest";
import {
  agruparAlertas,
  derivarAlineacionOperativa,
  derivarAlertas,
  derivarLecturaAplicadaRelacional,
  derivarSintesisTrazabilidad,
  derivarSintesisRelacional,
} from "./rules";

describe("core/domain/casos/detalle/rules", () => {
  it("marca alineacion cuando la continuidad acompana la accion prioritaria y tiene fecha", () => {
    const alineacion = derivarAlineacionOperativa({
      accionPrioritaria: "Registrar informe técnico",
      proximaAccionActual: "Registrar informe",
      proximaFechaActual: "2099-01-03T00:00:00.000Z",
    });

    expect(alineacion.estado).toBe("alineada");
    expect(alineacion.label).toBe("Alineada");
    expect(alineacion.warning).toBeNull();
    expect(alineacion.sugerencia_correccion).toBe(
      "Mantén la continuidad enfocada en Registrar informe técnico."
    );
  });

  it("marca continuidad insuficiente cuando falta proxima accion actual", () => {
    const alineacion = derivarAlineacionOperativa({
      accionPrioritaria: "Preparar cotización",
      proximaAccionActual: null,
      proximaFechaActual: null,
    });

    expect(alineacion.estado).toBe("parcial");
    expect(alineacion.label).toBe("Continuidad insuficiente");
    expect(alineacion.warning).toBeNull();
    expect(alineacion.sugerencia_correccion).toBe(
      "Define una próxima acción para priorizar Preparar cotización."
    );
  });

  it("marca desalineacion cuando la continuidad apunta a otra cosa", () => {
    const alineacion = derivarAlineacionOperativa({
      accionPrioritaria: "Preparar cotización",
      proximaAccionActual: "Validar diagnóstico",
      proximaFechaActual: "2099-01-03T00:00:00.000Z",
    });

    expect(alineacion.estado).toBe("desalineada");
    expect(alineacion.label).toBe("Desalineada");
    expect(alineacion.warning).not.toBeNull();
    expect(alineacion.warning?.code).toBe("continuidad_desalineada_con_prioridad");
    expect(alineacion.warning?.family).toBe("continuidad");
    expect(alineacion.warning?.severity).toBe("media");
    expect(alineacion.warning?.title).toBe("Continuidad desalineada con prioridad");
    expect(alineacion.warning?.message).toBe(
      "La próxima acción actual no acompaña la acción prioritaria sugerida por el sistema."
    );
    expect(alineacion.warning?.suggestion).toBe(
      "Ajusta la próxima acción para priorizar Preparar cotización."
    );
    expect(alineacion.sugerencia_correccion).toBe(
      "Ajusta la próxima acción para priorizar Preparar cotización."
    );
  });

  it("deriva una sintesis relacional dominante cuando hay friccion y desgaste altos", () => {
    const sintesis = derivarSintesisRelacional({
      confianza: "media",
      friccion: "alta",
      desgaste: "alto",
      claridad: "media",
      conversion: "media",
    });

    expect(sintesis.estado).toBe("tension");
    expect(sintesis.label).toBe("Vínculo en tensión");
    expect(sintesis.descripcion).toContain("vínculo tensionado");
  });

  it("traduce la sintesis relacional a una implicacion operativa concreta", () => {
    const lectura = derivarLecturaAplicadaRelacional({
      sintesis: {
        estado: "incierto",
        label: "Intención poco clara",
        descripcion: "Predomina una intención poco definida.",
      },
      claridad: "baja",
      friccion: "media",
      conversion: "baja",
      requiereValidacion: false,
      proximaAccion: null,
      proximaFecha: null,
    });

    expect(lectura).toContain("Aclara la intención del cliente");
  });

  it("agrupa alertas por familia para mejorar la lectura operativa", () => {
    const grupos = agruparAlertas([
      {
        codigo: "sla",
        label: "SLA en riesgo.",
        severidad: "critical",
        familia: "criticas",
        familia_label: "Críticas",
        taxonomia: {
          dimension: "operativa",
          origen_causal: "indeterminado",
          proposito: "monitoreo_flujo",
        },
      },
      {
        codigo: "proxima_fecha",
        label: "Próxima fecha programada.",
        severidad: "info",
        familia: "continuidad",
        familia_label: "Seguimiento y continuidad",
        taxonomia: {
          dimension: "operativa",
          origen_causal: "indeterminado",
          proposito: "monitoreo_flujo",
        },
      },
      {
        codigo: "sin_evidencia",
        label: "No hay evidencia visual.",
        severidad: "warning",
        familia: "faltantes_estructurales",
        familia_label: "Faltantes estructurales",
        taxonomia: {
          dimension: "estructural",
          origen_causal: "interno",
          proposito: "integridad_expediente",
        },
      },
    ]);

    expect(grupos.map((grupo) => grupo.key)).toEqual([
      "criticas",
      "continuidad",
      "faltantes_estructurales",
    ]);
    expect(grupos[0]?.label).toBe("Críticas");
  });

  it("resume la trazabilidad con actividad reciente, alerta dominante y cobertura", () => {
    const sintesis = derivarSintesisTrazabilidad({
      alertas: [
        {
          codigo: "sin_evidencia",
          label: "No hay evidencia visual.",
          severidad: "warning",
          familia: "faltantes_estructurales",
          familia_label: "Faltantes estructurales",
          taxonomia: {
            dimension: "estructural",
            origen_causal: "interno",
            proposito: "integridad_expediente",
          },
        },
      ],
      historial_operativo: [],
      timeline: [
        {
          titulo: "Seguimiento registrado",
          fecha: "2099-01-03T00:00:00.000Z",
          detalle: "Seguimiento comercial registrado.",
        },
      ],
    });

    expect(sintesis.actividad_reciente).toBe("Seguimiento registrado");
    expect(sintesis.alerta_dominante).toBe("No hay evidencia visual.");
    expect(sintesis.cobertura_registro).toContain("recorrido cronológico");
  });

  it("incorpora señales relacionales taxonomizadas cuando el vínculo está en tensión", () => {
    const alertas = derivarAlertas(
      {
        caso: {
          caso: {
            id: "caso-1",
            prioridad: "media",
            created_at: "2099-01-01T00:00:00.000Z",
            estado_comercial: "en_proceso",
            proxima_accion: "Dar seguimiento",
            proxima_fecha: "2099-01-02",
          },
          derivados: {},
          metadata: {
            origen: "test",
            timestamp: "2099-01-01T00:00:00.000Z",
          },
        },
        host: {
          estado_raw: "solicitud_recibida",
          descripcion_inicial: null,
          canal_entrada: null,
          tipo_solicitud: null,
          responsable_actual: null,
          creado_por: null,
          diagnostico_por: null,
          cotizacion_por: null,
          seguimiento_por: null,
          cliente_id: null,
          cliente_nombre: null,
          cliente_empresa: null,
        },
        informe: null,
        evidencias: [],
        diagnostico: null,
        diagnosticoAgente: null,
        cotizacion: null,
        seguimiento: null,
        logistica: null,
        auditoria: null,
        postventa: null,
        cierreTecnico: null,
        bitacora: [],
      },
      {
        slaEtiqueta: "SLA próximo a vencer",
        slaDescripcion: "La continuidad actual sigue dentro de plazo, pero necesita atención cercana.",
        proximaFecha: "2099-01-02",
        sintesisRelacional: {
          estado: "tension",
          label: "Vínculo en tensión",
          descripcion: "Predomina un vínculo tensionado por fricción y desgaste acumulado.",
        },
      }
    );

    const alertaRelacional = alertas.find(
      (alerta) => alerta.codigo === "vinculo_tensionado"
    );

    expect(alertaRelacional).toBeDefined();
    expect(alertaRelacional?.taxonomia.dimension).toBe("relacional");
    expect(alertaRelacional?.taxonomia.origen_causal).toBe("mixto");
    expect(alertaRelacional?.taxonomia.proposito).toBe("calidad_vinculo");
  });
});
