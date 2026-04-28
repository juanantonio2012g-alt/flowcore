import { describe, expect, it } from "vitest";
import {
  AGENTE_OPERATIVO_ACTIVO,
  derivarResponsabilidadOperativa,
  normalizarResponsableHumano,
} from "./responsabilidad-operativa";

describe("responsabilidad operativa del caso", () => {
  it("no trata macroáreas como responsables humanos", () => {
    expect(normalizarResponsableHumano("Comercial")).toBeNull();
    expect(normalizarResponsableHumano("Técnico")).toBeNull();
    expect(normalizarResponsableHumano("Administración")).toBeNull();
    expect(normalizarResponsableHumano("Operaciones")).toBeNull();
  });

  it("conserva una persona real como responsable humano", () => {
    expect(normalizarResponsableHumano("Ana Vásquez")).toBe("Ana Vásquez");
  });

  it("expone IA agent como agente operativo separado del humano", () => {
    const responsabilidad = derivarResponsabilidadOperativa({
      macroareaActual: "tecnico",
      responsableActual: null,
    });

    expect(responsabilidad.macroarea_label).toBe("Técnico");
    expect(responsabilidad.responsable_humano).toBeNull();
    expect(responsabilidad.responsable_humano_label).toBe("Sin asignar");
    expect(responsabilidad.agente_operativo_activo).toBe(
      AGENTE_OPERATIVO_ACTIVO
    );
    expect(responsabilidad.agente_ia_activo.codigo).toBe("ia-agent-tecnico");
    expect(responsabilidad.agente_ia_activo.tipo_registro).toBe("system_agent");
  });

  it("prefiere la asignación humana formal sobre responsable_actual legacy", () => {
    const responsabilidad = derivarResponsabilidadOperativa({
      macroareaActual: "comercial",
      responsableActual: "Comercial",
      responsableHumanoId: "123e4567-e89b-12d3-a456-426614174000",
      responsableHumanoNombre: "María Torres",
      responsableHumanoAsignadoPor: "admin@test",
      responsableHumanoAsignadoAt: "2026-04-22T22:30:00.000Z",
    });

    expect(responsabilidad.responsable_humano_id).toBe(
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(responsabilidad.responsable_humano).toBe("María Torres");
    expect(responsabilidad.responsable_humano_label).toBe("María Torres");
    expect(responsabilidad.responsable_actual_raw).toBe("Comercial");
    expect(responsabilidad.responsable_humano_asignado_por).toBe("admin@test");
    expect(responsabilidad.responsable_humano_asignado_at).toBe(
      "2026-04-22T22:30:00.000Z"
    );
  });
});
