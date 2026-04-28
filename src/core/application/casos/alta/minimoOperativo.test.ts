import { describe, expect, it } from "vitest";
import {
  MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO,
  tieneDescripcionMinimaAltaCaso,
} from "./minimoOperativo";

describe("tieneDescripcionMinimaAltaCaso", () => {
  it("rechaza descripciones sin contenido suficiente", () => {
    expect(tieneDescripcionMinimaAltaCaso("")).toBe(false);
    expect(tieneDescripcionMinimaAltaCaso("muy corto")).toBe(false);
  });

  it("normaliza espacios antes de medir el contenido", () => {
    const descripcion = "  falla   electrica   en   tablero  ";

    expect(descripcion.trim().length).toBeGreaterThanOrEqual(
      MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO
    );
    expect(tieneDescripcionMinimaAltaCaso(descripcion)).toBe(true);
  });
});
