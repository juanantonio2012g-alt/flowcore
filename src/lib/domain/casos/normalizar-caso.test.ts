import { describe, expect, it } from "vitest";
import { normalizarCaso } from "./normalizar-caso";

describe("normalizarCaso - dominio operativo", () => {
  it("marca riesgo alto cuando el SLA está vencido", () => {
    const caso = normalizarCaso(
      {
        id: "caso-1",
        prioridad: "alta",
        created_at: "2025-01-01T00:00:00.000Z",
        proxima_accion: "Dar seguimiento comercial",
        proxima_fecha: "2025-01-05T00:00:00.000Z",
        estado_comercial: "en_proceso",
      },
      {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
      }
    );

    expect(caso.sla_nivel).toBe("rojo");
    expect(caso.riesgo).toBe("alto");
  });

  it("expone etiqueta y descripción de SLA derivadas", () => {
    const caso = normalizarCaso(
      {
        id: "caso-2",
        prioridad: "media",
        created_at: "2025-01-01T00:00:00.000Z",
        proxima_accion: "Registrar informe técnico",
        proxima_fecha: "2025-01-03T00:00:00.000Z",
      },
      {
        tieneInforme: false,
        tieneDiagnostico: false,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      }
    );

    expect(caso.sla_etiqueta).toBe("SLA vencido");
    expect(caso.sla_descripcion).toContain("fuera del tiempo esperado");
  });

  it("prioriza recomendación de validación cuando corresponde", () => {
    const caso = normalizarCaso(
      {
        id: "caso-3",
        prioridad: "urgente",
        created_at: "2025-01-01T00:00:00.000Z",
        proxima_accion: null,
        proxima_fecha: null,
      },
      {
        tieneInforme: true,
        tieneDiagnostico: true,
        requiereValidacion: true,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      }
    );

    expect(caso.recomendacion_accion).toBe("Validar diagnóstico humano");
    expect(caso.recomendacion_urgencia).toBe("alta");
    expect(caso.requiere_validacion).toBe(true);
    expect(caso.macroarea_actual).toBe("tecnico");
  });

  it("asigna macroárea de operaciones cuando falta continuidad (ambiguo)", () => {
    const caso = normalizarCaso(
      {
        id: "caso-4",
        prioridad: "media",
        created_at: "2026-03-01T00:00:00.000Z",
        estado_comercial: "en_proceso",
        proxima_accion: null,
        proxima_fecha: null,
      },
      {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
      }
    );

    expect(caso.macroarea_actual).toBe("operaciones");
    expect(caso.macroarea_motivo.toLowerCase()).toContain("ambiguo");
  });

  it("detecta señal técnica: falla - redirige a técnico aunque sea ambiguo", () => {
    const caso = normalizarCaso(
      {
        id: "caso-4b",
        prioridad: "media",
        created_at: "2026-03-01T00:00:00.000Z",
        estado_comercial: "en_proceso",
        proxima_accion: "Diagnosticar la falla en el equipo",
        proxima_fecha: null,
      },
      {
        tieneInforme: false,
        tieneDiagnostico: false,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      }
    );

    expect(caso.macroarea_actual).toBe("tecnico");
    expect(caso.macroarea_motivo.toLowerCase()).toContain("señal técnica");
  });

  it("detecta señal técnica: problema y humedad - redirige a técnico", () => {
    const caso = normalizarCaso(
      {
        id: "caso-4c",
        prioridad: "alta",
        created_at: "2026-03-01T00:00:00.000Z",
        estado_comercial: "en_proceso",
        proxima_accion: "Revisar el problema de humedad en la instalación",
        proxima_fecha: null,
      },
      {
        tieneInforme: false,
        tieneDiagnostico: false,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      }
    );

    expect(caso.macroarea_actual).toBe("tecnico");
    expect(caso.macroarea_motivo.toLowerCase()).toContain("señal técnica");
  });

  it("detecta señal técnica: daño - redirige a técnico", () => {
    const caso = normalizarCaso(
      {
        id: "caso-4d",
        prioridad: "urgente",
        created_at: "2026-03-01T00:00:00.000Z",
        estado_comercial: "en_proceso",
        proxima_accion: "Evaluar daño en el componente",
        proxima_fecha: null,
      },
      {
        tieneInforme: false,
        tieneDiagnostico: false,
        tieneCotizacion: false,
        tieneSeguimiento: false,
      }
    );

    expect(caso.macroarea_actual).toBe("tecnico");
    expect(caso.macroarea_motivo.toLowerCase()).toContain("señal técnica");
  });

  it("no sigue recomendando 'Dar seguimiento comercial' cuando ya existe seguimiento reciente", () => {
    const caso = normalizarCaso(
      {
        id: "caso-5",
        prioridad: "media",
        created_at: "2026-04-01T00:00:00.000Z",
        estado_comercial: "negociacion",
        proxima_accion: "Llamar para cerrar definición",
        proxima_fecha: "2026-04-09",
      },
      {
        tieneInforme: true,
        tieneDiagnostico: true,
        tieneCotizacion: true,
        tieneSeguimiento: true,
      }
    );

    expect(caso.recomendacion_accion).toBe("Continuar gestión comercial");
    expect(caso.recomendacion_motivo.toLowerCase()).toContain("ya registra seguimiento");
  });
});
