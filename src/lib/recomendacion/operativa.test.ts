import { describe, expect, it } from "vitest";
import { recomendarAccionOperativa } from "./operativa";

describe("recomendarAccionOperativa", () => {
  it("mantiene 'Dar seguimiento comercial' cuando todavia no existe seguimiento", () => {
    const recomendacion = recomendarAccionOperativa({
      estadoComercial: "negociacion",
      riesgo: "medio",
      tieneInforme: true,
      tieneDiagnostico: true,
      tieneCotizacion: true,
      tieneSeguimiento: false,
      proximaAccion: null,
      proximaFecha: null,
    });

    expect(recomendacion.accion).toBe("Dar seguimiento comercial");
  });

  it("usa una recomendacion mas precisa cuando ya existe seguimiento comercial", () => {
    const recomendacion = recomendarAccionOperativa({
      estadoComercial: "negociacion",
      riesgo: "medio",
      tieneInforme: true,
      tieneDiagnostico: true,
      tieneCotizacion: true,
      tieneSeguimiento: true,
      proximaAccion: "Llamar para cerrar definición",
      proximaFecha: "2026-04-08",
    });

    expect(recomendacion.accion).toBe("Continuar gestión comercial");
    expect(recomendacion.fechaSugerida).toBe("2026-04-08");
  });

  it("propone esperar respuesta cuando el seguimiento ya dejo el caso del lado del cliente", () => {
    const recomendacion = recomendarAccionOperativa({
      estadoComercial: "esperando_cliente",
      riesgo: "medio",
      tieneInforme: true,
      tieneDiagnostico: true,
      tieneCotizacion: true,
      tieneSeguimiento: true,
      proximaAccion: "Esperar respuesta del cliente",
      proximaFecha: "2026-04-09",
    });

    expect(recomendacion.accion).toBe("Esperar respuesta del cliente");
  });

  it("reprograma seguimiento cuando ya hubo gestion pero no quedo continuidad definida", () => {
    const recomendacion = recomendarAccionOperativa({
      estadoComercial: "en_proceso",
      riesgo: "medio",
      tieneInforme: true,
      tieneDiagnostico: true,
      tieneCotizacion: true,
      tieneSeguimiento: true,
      proximaAccion: null,
      proximaFecha: null,
    });

    expect(recomendacion.accion).toBe("Reprogramar seguimiento");
  });
});
