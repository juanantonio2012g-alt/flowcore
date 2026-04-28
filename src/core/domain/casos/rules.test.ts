import { describe, expect, it } from "vitest";
import {
  derivarEstadoValidacionDiagnostico,
  derivarRequiereValidacionDiagnostico,
} from "./rules";

describe("core/domain/casos/rules", () => {
  it("deriva validacion cuando el diagnostico tiene certeza media o menor y no hay informe", () => {
    const validacion = derivarRequiereValidacionDiagnostico({
      tieneDiagnostico: true,
      requiereValidacionManual: false,
      tieneInformeTecnico: false,
      nivelCerteza: "medio",
      problematicaIdentificada: "Humedad visible en el plafon",
      causaProbable: "Filtracion lateral",
      categoriaCaso: "humedad_filtracion",
      solucionRecomendada: "Reparar el punto de ingreso y resanar",
    });

    expect(validacion.requiere_validacion_manual).toBe(false);
    expect(validacion.requiere_validacion_derivada).toBe(true);
    expect(validacion.requiere_validacion_final).toBe(true);
    expect(validacion.motivo_validacion).toContain(
      "Nivel de certeza medio o menor."
    );
    expect(validacion.motivo_validacion).toContain(
      "No existe informe técnico asociado."
    );
  });

  it("no deriva validacion cuando aun no existe diagnostico", () => {
    const validacion = derivarRequiereValidacionDiagnostico({
      tieneDiagnostico: false,
      requiereValidacionManual: false,
      tieneInformeTecnico: false,
      nivelCerteza: "medio",
    });

    expect(validacion.requiere_validacion_derivada).toBe(false);
    expect(validacion.requiere_validacion_final).toBe(false);
    expect(validacion.motivo_validacion).toEqual([]);
  });

  it("detecta desalineacion entre categoria humana y sugerencia del agente", () => {
    const validacion = derivarRequiereValidacionDiagnostico({
      tieneDiagnostico: true,
      requiereValidacionManual: false,
      tieneInformeTecnico: true,
      nivelCerteza: "alto",
      problematicaIdentificada: "Fisura horizontal",
      causaProbable: "Movimiento estructural",
      categoriaCaso: "grietas_fisuras",
      solucionRecomendada: "Sellado flexible y evaluacion estructural",
      categoriaProbableAgente: "humedad_filtracion",
    });

    expect(validacion.requiere_validacion_derivada).toBe(true);
    expect(validacion.motivo_validacion).toContain(
      "Existe desalineación entre la categoría humana y la categoría sugerida por el agente."
    );
  });

  it("resuelve la validacion pendiente cuando el diagnostico queda validado", () => {
    const validacion = derivarEstadoValidacionDiagnostico({
      tieneDiagnostico: true,
      requiereValidacionManual: true,
      tieneInformeTecnico: true,
      nivelCerteza: "alto",
      resultadoValidacion: "validado",
      validadoPor: "tecnico@test.com",
      fechaValidacion: "2026-04-05",
    });

    expect(validacion.requiere_validacion_manual).toBe(true);
    expect(validacion.validacion_pendiente).toBe(false);
    expect(validacion.validacion_resuelta).toBe(true);
    expect(validacion.requiere_validacion_final).toBe(true);
    expect(validacion.resultado_validacion).toBe("validado");
    expect(validacion.validado_por).toBe("tecnico@test.com");
  });

  it("mantiene cautela cuando la validacion queda observada", () => {
    const validacion = derivarEstadoValidacionDiagnostico({
      tieneDiagnostico: true,
      requiereValidacionManual: false,
      tieneInformeTecnico: false,
      nivelCerteza: "medio",
      resultadoValidacion: "observado",
      observacionValidacion: "Falta contraste con el informe técnico.",
    });

    expect(validacion.validacion_pendiente).toBe(true);
    expect(validacion.validacion_resuelta).toBe(false);
    expect(validacion.requiere_validacion_final).toBe(true);
    expect(validacion.resultado_validacion).toBe("observado");
    expect(validacion.observacion_validacion).toContain("Falta contraste");
  });

  it("marca rechazo como validacion resuelta con diagnostico no confirmado", () => {
    const validacion = derivarEstadoValidacionDiagnostico({
      tieneDiagnostico: true,
      requiereValidacionManual: false,
      tieneInformeTecnico: true,
      nivelCerteza: "alto",
      resultadoValidacion: "rechazado",
      observacionValidacion: "El criterio no coincide con la evidencia.",
    });

    expect(validacion.validacion_pendiente).toBe(false);
    expect(validacion.validacion_resuelta).toBe(true);
    expect(validacion.requiere_validacion_final).toBe(false);
    expect(validacion.resultado_validacion).toBe("rechazado");
  });
});
