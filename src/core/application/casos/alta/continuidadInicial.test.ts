import { describe, expect, it, vi } from "vitest";
import { derivarContinuidadInicialCaso } from "./continuidadInicial";

describe("core/application/casos/alta/continuidadInicial", () => {
  it("siembra continuidad inicial coherente para prioridad media", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00.000Z"));

    const continuidad = derivarContinuidadInicialCaso({
      prioridad: "media",
    });

    expect(continuidad).toEqual({
      proxima_accion: "Registrar informe técnico",
      proxima_fecha: "2099-01-02",
    });

    vi.useRealTimers();
  });

  it("usa fecha de hoy para prioridad urgente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-01-01T12:00:00.000Z"));

    const continuidad = derivarContinuidadInicialCaso({
      prioridad: "urgente",
    });

    expect(continuidad).toEqual({
      proxima_accion: "Registrar informe técnico",
      proxima_fecha: "2099-01-01",
    });

    vi.useRealTimers();
  });
});
