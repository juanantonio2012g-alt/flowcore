import { describe, expect, it } from "vitest";
import {
  derivarModoDiagnosticoVigente,
  derivarModoValidacionDiagnosticoVigente,
} from "./ui";

describe("derivarModoDiagnosticoVigente", () => {
  it("mantiene modo create cuando no existe diagnostico vigente", () => {
    const modo = derivarModoDiagnosticoVigente(null);

    expect(modo.accion).toBe("registrar_diagnostico");
    expect(modo.diagnosticoId).toBeNull();
    expect(modo.accionDisponibleLabel).toBe("Registrar diagnóstico");
  });

  it("cambia a reevaluacion cuando ya existe diagnostico vigente", () => {
    const modo = derivarModoDiagnosticoVigente({
      id: "diag-1",
      problematica_identificada: "Fisuras activas",
      causa_probable: "Movimiento estructural",
      nivel_certeza: "medio",
      categoria_caso: "grietas_fisuras",
      solucion_recomendada: "Sellado",
      producto_recomendado: null,
      proceso_sugerido: null,
      observaciones_tecnicas: null,
      requiere_validacion: true,
      fecha_validacion: "2026-04-09",
      created_at: "2026-04-08T00:00:00.000Z",
    });

    expect(modo.accion).toBe("actualizar_diagnostico");
    expect(modo.diagnosticoId).toBe("diag-1");
    expect(modo.cta).toBe("Guardar reevaluación");
    expect(modo.accionSugeridaLabel).toBe("Reevaluar diagnóstico actual");
  });

  it("mantiene validacion normal cuando el diagnostico aun no fue resuelto", () => {
    const modo = derivarModoValidacionDiagnosticoVigente({
      id: "diag-1",
      problematica_identificada: "Fisuras activas",
      causa_probable: "Movimiento estructural",
      nivel_certeza: "medio",
      categoria_caso: "grietas_fisuras",
      solucion_recomendada: "Sellado",
      producto_recomendado: null,
      proceso_sugerido: null,
      observaciones_tecnicas: null,
      requiere_validacion: true,
      validacion_pendiente: true,
      validacion_resuelta: false,
      resultado_validacion: null,
      fecha_validacion: "2026-04-09",
      created_at: "2026-04-08T00:00:00.000Z",
    });

    expect(modo.disponible).toBe(true);
    expect(modo.toggleLabel).toBe("Validar diagnóstico");
    expect(modo.submitLabel).toBe("Registrar validación");
  });

  it("cambia a revalidacion cuando el diagnostico vigente ya fue validado", () => {
    const modo = derivarModoValidacionDiagnosticoVigente({
      id: "diag-1",
      problematica_identificada: "Fisuras activas",
      causa_probable: "Movimiento estructural",
      nivel_certeza: "medio",
      categoria_caso: "grietas_fisuras",
      solucion_recomendada: "Sellado",
      producto_recomendado: null,
      proceso_sugerido: null,
      observaciones_tecnicas: null,
      requiere_validacion: true,
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      fecha_validacion: "2026-04-09",
      created_at: "2026-04-08T00:00:00.000Z",
    });

    expect(modo.disponible).toBe(true);
    expect(modo.titulo).toBe("Acción formal de revalidación");
    expect(modo.toggleLabel).toBe("Revalidar diagnóstico");
    expect(modo.submitLabel).toBe("Guardar revalidación");
    expect(modo.successMessage).toBe("Revalidación registrada correctamente.");
  });
});
