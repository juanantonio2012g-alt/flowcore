import { describe, expect, it, vi } from "vitest";
import { persistEventoAgenteIA } from "./persistEventoAgenteIA";
import type { EventoAgenteIA } from "./buildEventoAgenteIA";

function buildEvento(
  partial: Partial<EventoAgenteIA> = {}
): EventoAgenteIA {
  return {
    caso_id: partial.caso_id ?? "caso-1",
    agente_ia_id:
      partial.agente_ia_id ?? "ia-00000000-0000-4000-8000-000000000003",
    agente_ia_codigo: partial.agente_ia_codigo ?? "ia-agent-tecnico",
    tipo_de_input: partial.tipo_de_input ?? "validacion_pendiente",
    prioridad_operativa: partial.prioridad_operativa ?? "alta",
    señales_detectadas:
      partial.señales_detectadas ?? ["validacion_pendiente", "workflow_con_alertas"],
    sugerencia_operativa: partial.sugerencia_operativa ?? {
      resumen: "Hay una validación pendiente.",
      motivo: "El caso requiere validación antes de avanzar.",
      requiere_supervision_humana: true,
      fecha_sugerida: "2026-04-24",
    },
    accion_recomendada_opcional:
      partial.accion_recomendada_opcional ?? "Validar diagnóstico humano",
    source: "ia_agent",
    created_at: partial.created_at ?? "2026-04-24T12:00:00.000Z",
  };
}

function createSupabaseMock(error: { message: string } | null = null) {
  const iaAgentEventsTable = {
    insert: vi.fn(async () => ({ error })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "ia_agent_events") return iaAgentEventsTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    iaAgentEventsTable,
  };
}

describe("persistEventoAgenteIA", () => {
  it("persiste un evento del IA agent en su tabla dedicada", async () => {
    const supabase = createSupabaseMock();
    const evento = buildEvento();

    const result = await persistEventoAgenteIA(evento, {
      supabase: supabase as never,
    });

    expect(result.error).toBeNull();
    expect(result.record?.caso_id).toBe("caso-1");
    expect(supabase.iaAgentEventsTable.insert).toHaveBeenCalledWith({
      id: expect.any(String),
      caso_id: "caso-1",
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
    });
  });

  it("devuelve error controlado si no puede persistir el evento", async () => {
    const supabase = createSupabaseMock({
      message: "relation ia_agent_events does not exist",
    });

    const result = await persistEventoAgenteIA(buildEvento(), {
      supabase: supabase as never,
    });

    expect(result.record).toBeNull();
    expect(result.error).toBe("relation ia_agent_events does not exist");
  });
});
