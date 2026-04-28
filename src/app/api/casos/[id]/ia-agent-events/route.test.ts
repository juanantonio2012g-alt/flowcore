import { beforeEach, describe, expect, it, vi } from "vitest";

const { getEventosAgenteIAPorCaso } = vi.hoisted(() => ({
  getEventosAgenteIAPorCaso: vi.fn(),
}));

vi.mock("@/core/application/agentes-ia", () => ({
  getEventosAgenteIAPorCaso,
}));

describe("GET /api/casos/[id]/ia-agent-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEventosAgenteIAPorCaso.mockResolvedValue({
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

  it("expone la lectura histórica del IA agent por caso", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/casos/caso-1/ia-agent-events?limit=25"),
      {
        params: Promise.resolve({
          id: "caso-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    expect(getEventosAgenteIAPorCaso).toHaveBeenCalledWith("caso-1", {
      limit: 25,
    });
    await expect(response.json()).resolves.toEqual({
      ok: true,
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

  it("devuelve 400 si falta el id del caso", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/casos//ia-agent-events"),
      {
        params: Promise.resolve({
          id: "",
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(getEventosAgenteIAPorCaso).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "id es obligatorio",
    });
  });

  it("devuelve 400 si el limit es inválido", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/casos/caso-1/ia-agent-events?limit=0"),
      {
        params: Promise.resolve({
          id: "caso-1",
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(getEventosAgenteIAPorCaso).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "limit debe ser un entero positivo",
    });
  });

  it("devuelve 500 si ocurre un error inesperado", async () => {
    getEventosAgenteIAPorCaso.mockRejectedValue(new Error("fallo supabase"));
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/casos/caso-1/ia-agent-events"),
      {
        params: Promise.resolve({
          id: "caso-1",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "fallo supabase",
    });
  });
});
