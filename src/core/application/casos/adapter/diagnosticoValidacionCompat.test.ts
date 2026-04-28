import { describe, expect, it } from "vitest";
import {
  completarCamposValidacionDiagnosticoCompat,
  completarListaValidacionDiagnosticoCompat,
  esErrorEsquemaValidacionDiagnosticoFaltante,
} from "./diagnosticoValidacionCompat";

describe("diagnosticoValidacionCompat", () => {
  it("detecta cuando falta una columna nueva de validacion", () => {
    expect(
      esErrorEsquemaValidacionDiagnosticoFaltante({
        message: "column diagnosticos.resultado_validacion does not exist",
      })
    ).toBe(true);
  });

  it("no marca errores ajenos al schema de validacion", () => {
    expect(
      esErrorEsquemaValidacionDiagnosticoFaltante({
        message: "permission denied for table diagnosticos",
      })
    ).toBe(false);
  });

  it("completa con null los campos nuevos al leer schema legado", () => {
    expect(
      completarCamposValidacionDiagnosticoCompat({
        id: "diag-1",
        caso_id: "caso-1",
      })
    ).toEqual({
      id: "diag-1",
      caso_id: "caso-1",
      validado_por: null,
      resultado_validacion: null,
      observacion_validacion: null,
    });
    expect(
      completarListaValidacionDiagnosticoCompat([
        { id: "diag-1", caso_id: "caso-1" },
      ])
    ).toEqual([
      {
        id: "diag-1",
        caso_id: "caso-1",
        validado_por: null,
        resultado_validacion: null,
        observacion_validacion: null,
      },
    ]);
  });
});
