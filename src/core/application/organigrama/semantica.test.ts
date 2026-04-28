import { describe, expect, it } from "vitest";
import { derivarSemanticaCasoOperativo } from "./semantica";

describe("core/application/organigrama/semantica", () => {
  it("marca incidencia cuando la continuidad o la transición del caso están bloqueadas", () => {
    const semantica = derivarSemanticaCasoOperativo({
      workflow_etapa_actual: "postventa",
      proxima_accion_real: "Gestionar acción postventa pendiente",
      workflow_continuidad_estado: "bloqueada",
      workflow_alineacion_sla: "coherente",
      workflow_transicion_estado: "bloqueada",
    });

    expect(semantica.etapa_label).toBe("Postventa");
    expect(semantica.accion_actual).toBe(
      "Gestionar acción postventa pendiente"
    );
    expect(semantica.estado_contexto).toBe("incidencia");
    expect(semantica.estado_contexto_label).toBe("Incidencia operativa");
  });

  it("marca fase normal cuando el caso sigue el flujo sin tensión visible", () => {
    const semantica = derivarSemanticaCasoOperativo({
      workflow_etapa_actual: "cierre_tecnico",
      proxima_accion_real: "Cerrar técnicamente el caso",
      workflow_continuidad_estado: "al_dia",
      workflow_alineacion_sla: "coherente",
      workflow_transicion_estado: "habilitada",
    });

    expect(semantica.etapa_label).toBe("Cierre técnico");
    expect(semantica.estado_contexto).toBe("normal");
    expect(semantica.estado_contexto_label).toBe("Fase normal del flujo");
  });
});
