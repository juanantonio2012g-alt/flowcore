import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HistorialAgenteIA from "./historial-agente-ia";

describe("HistorialAgenteIA", () => {
  it("renderiza el historial separado del IA agent con sus eventos", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialAgenteIA, {
        historial: {
          caso_id: "caso-1",
          total: 1,
          generated_at: "2026-04-24T15:30:00.000Z",
          eventos: [
            {
              agente_ia_id: "ia-00000000-0000-4000-8000-000000000003",
              agente_ia_codigo: "ia-agent-tecnico",
              tipo_de_input: "validacion_pendiente",
              prioridad_operativa: "alta",
              señales_detectadas: ["validacion_pendiente", "workflow_con_alertas"],
              sugerencia_operativa: {
                resumen: "Hay una validación pendiente.",
                motivo: "El caso requiere validación antes de avanzar.",
                requiere_supervision_humana: true,
                fecha_sugerida: "2026-04-24",
              },
              accion_recomendada_opcional: "Validar diagnóstico humano",
              source: "ia_agent",
              created_at: "2026-04-24T12:00:00.000Z",
            },
          ],
        },
      })
    );

    expect(html).toContain("Historial IA agent");
    expect(html).toContain("Lectura histórica separada de la bitácora humana");
    expect(html).toContain("ia-agent-tecnico");
    expect(html).toContain("Validar diagnóstico humano");
    expect(html).toContain("workflow_con_alertas");
  });

  it("renderiza un estado de error sin mezclar eventos", () => {
    const html = renderToStaticMarkup(
      createElement(HistorialAgenteIA, {
        historial: null,
        error: "fallo supabase",
      })
    );

    expect(html).toContain("No se pudo cargar el historial del IA agent.");
    expect(html).toContain("fallo supabase");
  });
});

