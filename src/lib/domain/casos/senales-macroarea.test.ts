import { describe, expect, it } from "vitest";
import { calcularSenalesMacroarea, type CasoMacroareaSignalInput } from "./senales-macroarea";

function caso(partial: Partial<CasoMacroareaSignalInput>): CasoMacroareaSignalInput {
  return {
    id: partial.id ?? crypto.randomUUID(),
    macroarea_actual: partial.macroarea_actual ?? "operaciones",
    estado_comercial_real: partial.estado_comercial_real ?? "en_proceso",
    proxima_accion_real: partial.proxima_accion_real ?? "Dar seguimiento comercial",
    proxima_fecha_real: partial.proxima_fecha_real ?? "2026-04-05T00:00:00.000Z",
    riesgo: partial.riesgo ?? "medio",
    requiere_validacion: partial.requiere_validacion ?? false,
    created_at: partial.created_at ?? "2026-03-28T00:00:00.000Z",
  };
}

describe("calcularSenalesMacroarea", () => {
  it("agrega señales base por macroárea", () => {
    const output = calcularSenalesMacroarea(
      [
        caso({
          id: "op-1",
          macroarea_actual: "operaciones",
          proxima_accion_real: "Sin próxima acción",
          proxima_fecha_real: null,
        }),
        caso({
          id: "tec-1",
          macroarea_actual: "tecnico",
          requiere_validacion: true,
          riesgo: "alto",
          proxima_fecha_real: "2026-03-20T00:00:00.000Z",
        }),
        caso({
          id: "com-1",
          macroarea_actual: "comercial",
          estado_comercial_real: "negociacion",
          proxima_fecha_real: "2026-04-10T00:00:00.000Z",
        }),
      ],
      { fechaReferenciaIso: "2026-03-31" }
    );

    expect(output.totalCasos).toBe(3);
    expect(output.porMacroarea.operaciones.casosConContinuidadRota).toBe(1);
    expect(output.porMacroarea.tecnico.casosConRiesgoAlto).toBe(1);
    expect(output.porMacroarea.tecnico.casosVencidos).toBe(1);
    expect(output.porMacroarea.comercial.casosConMovimientoReciente).toBe(1);
  });

  it("sube señal de delegación cuando hay presión crítica", () => {
    const casos = Array.from({ length: 8 }, (_, idx) =>
      caso({
        id: `com-${idx}`,
        macroarea_actual: "comercial",
        riesgo: idx < 4 ? "alto" : "medio",
        proxima_accion_real: idx < 3 ? "Sin próxima acción" : "Dar seguimiento comercial",
        proxima_fecha_real: idx < 5 ? null : "2026-03-20T00:00:00.000Z",
        requiere_validacion: idx % 3 === 0,
      })
    );

    const output = calcularSenalesMacroarea(casos, {
      fechaReferenciaIso: "2026-03-31",
    });

    expect(output.porMacroarea.comercial.senalDelegacion).toBe("alta");
    expect(output.porMacroarea.comercial.senalDelegacionMotivo.length).toBeGreaterThan(10);
  });
});
