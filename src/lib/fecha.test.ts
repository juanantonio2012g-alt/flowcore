import { describe, expect, it } from "vitest";
import { formatearFecha, formatearFechaCorta } from "./fecha";

describe("lib/fecha", () => {
  it("mantiene el mismo dia visible para fechas sin hora", () => {
    expect(formatearFecha("2026-04-07")).toBe("7 abr 2026");
    expect(formatearFechaCorta("2026-04-07")).toBe("7 abr 2026");
  });

  it("mantiene hora para timestamps completos", () => {
    expect(formatearFecha("2026-04-07T14:46:01.14169+00:00")).toBe(
      "7 abr 2026, 10:46 a. m."
    );
  });
});
