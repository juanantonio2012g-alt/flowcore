import { describe, expect, it } from "vitest";
import {
  derivarSeguimientoComercial,
  labelEstadoComercialPrincipal,
} from "./comercial";

describe("seguimiento/comercial", () => {
  it("normaliza estados heredados a un principal rector con señal complementaria", () => {
    const lectura = derivarSeguimientoComercial({
      estadoComercial: "negociacion",
      senalesComerciales: [],
    });

    expect(lectura.estado_principal).toBe("en_proceso");
    expect(lectura.senales_comerciales).toEqual(["negociacion"]);
  });

  it("mantiene el estado principal y sus señales complementarias válidas", () => {
    const lectura = derivarSeguimientoComercial({
      estadoComercial: "en_proceso",
      senalesComerciales: ["requiere_ajuste", "cliente_pidio_tiempo"],
    });

    expect(lectura.estado_principal).toBe("en_proceso");
    expect(lectura.senales_comerciales).toEqual([
      "requiere_ajuste",
      "cliente_pidio_tiempo",
    ]);
  });

  it("expone labels consistentes para el estado principal", () => {
    expect(labelEstadoComercialPrincipal("rechazado")).toBe(
      "Rechazado / sin conversion"
    );
  });
});
