import { describe, expect, it, vi } from "vitest";
import { listEventosAgenteIAPorCaso } from "./listEventosAgenteIAPorCaso";

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

function createSupabaseMock(
  data = [buildEventoPersistido()],
  error: { message: string } | null = null
) {
  const limit = vi.fn(async () => ({ data, error }));
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  const iaAgentEventsTable = { select };

  return {
    from: vi.fn((table: string) => {
      if (table === "ia_agent_events") return iaAgentEventsTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    iaAgentEventsTable,
    select,
    eq,
    order,
    limit,
  };
}

describe("listEventosAgenteIAPorCaso", () => {
  it("lista eventos históricos del IA agent por caso ordenados por created_at desc", async () => {
    const supabase = createSupabaseMock([
      buildEventoPersistido({ id: "evento-2", created_at: "2026-04-24T13:00:00.000Z" }),
      buildEventoPersistido({ id: "evento-1", created_at: "2026-04-24T12:00:00.000Z" }),
    ]);

    const result = await listEventosAgenteIAPorCaso("caso-1", {
      supabase: supabase as never,
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("evento-2");
    expect(supabase.from).toHaveBeenCalledWith("ia_agent_events");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("caso_id", "caso-1");
    expect(supabase.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(supabase.limit).toHaveBeenCalledWith(50);
  });

  it("permite aplicar un límite explícito", async () => {
    const supabase = createSupabaseMock();

    await listEventosAgenteIAPorCaso("caso-1", {
      limit: 10,
      supabase: supabase as never,
    });

    expect(supabase.limit).toHaveBeenCalledWith(10);
  });

  it("falla si no recibe casoId", async () => {
    await expect(listEventosAgenteIAPorCaso("")).rejects.toThrow(
      "casoId es obligatorio"
    );
  });

  it("propaga errores de lectura de Supabase", async () => {
    const supabase = createSupabaseMock([], {
      message: "permission denied for table ia_agent_events",
    });

    await expect(
      listEventosAgenteIAPorCaso("caso-1", {
        supabase: supabase as never,
      })
    ).rejects.toThrow("permission denied for table ia_agent_events");
  });
});
