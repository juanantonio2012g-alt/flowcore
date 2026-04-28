import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEventosAgenteIAPorCaso } from "./getEventosAgenteIAPorCaso";

const { listEventosAgenteIAPorCaso } = vi.hoisted(() => ({
  listEventosAgenteIAPorCaso: vi.fn(),
}));

vi.mock("@/core/domain/agentes-ia", () => ({
  listEventosAgenteIAPorCaso,
}));

function buildEventoPersistido(overrides: Record<string, unknown> = {}) {
  return {
    id: "evento-1",
    caso_id: "caso-1",
    agente_ia_id: "ia-00000000-0000-4000-8000-000000000003",
    agente_ia_codigo: "ia-agent-tecnico",
    tipo_de_input: "validacion_pendiente",
    prioridad_operativa: "alta",
    señales_detectadas: ["validacion_pendiente"],
    sugerencia_operativa: {
      resumen: "Hay una validación pendiente.",
      motivo: "El caso requiere validación antes de avanzar.",
      requiere_supervision_humana: true,
      fecha_sugerida: "2026-04-24",
    },
    accion_recomendada_opcional: "Validar diagnóstico humano",
    source: "ia_agent",
    created_at: "2026-04-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("getEventosAgenteIAPorCaso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T15:30:00.000Z"));
    listEventosAgenteIAPorCaso.mockResolvedValue([buildEventoPersistido()]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("construye un read model server-side del IA agent por caso", async () => {
    const result = await getEventosAgenteIAPorCaso("caso-1");

    expect(listEventosAgenteIAPorCaso).toHaveBeenCalledWith("caso-1", {
      limit: 50,
    });
    expect(result).toEqual({
      caso_id: "caso-1",
      eventos: [
        {
          agente_ia_id: "ia-00000000-0000-4000-8000-000000000003",
          agente_ia_codigo: "ia-agent-tecnico",
          tipo_de_input: "validacion_pendiente",
          prioridad_operativa: "alta",
          señales_detectadas: ["validacion_pendiente"],
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
      total: 1,
      generated_at: "2026-04-24T15:30:00.000Z",
    });
  });

  it("aplica límite explícito y lo acota a un máximo seguro", async () => {
    await getEventosAgenteIAPorCaso("caso-1", { limit: 250 });

    expect(listEventosAgenteIAPorCaso).toHaveBeenCalledWith("caso-1", {
      limit: 100,
    });
  });

  it("valida casoId obligatorio", async () => {
    await expect(getEventosAgenteIAPorCaso("")).rejects.toThrow(
      "casoId es obligatorio"
    );
  });

  it("valida que el límite sea un entero positivo", async () => {
    await expect(
      getEventosAgenteIAPorCaso("caso-1", { limit: 0 })
    ).rejects.toThrow("limit debe ser un entero positivo");
  });
});
