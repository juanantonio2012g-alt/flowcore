import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAgenteIA } from "./buildEventoAgenteIA";

export type EventoAgenteIAPersistido = EventoAgenteIA & {
  id: string;
};

export type PersistEventoAgenteIAResult = {
  record: EventoAgenteIAPersistido | null;
  error: string | null;
};

export async function persistEventoAgenteIA(
  evento: EventoAgenteIA,
  options: {
    supabase?: SupabaseClient;
  } = {}
): Promise<PersistEventoAgenteIAResult> {
  const supabase = options.supabase ?? createServerSupabaseClient();
  const record: EventoAgenteIAPersistido = {
    id: crypto.randomUUID(),
    ...evento,
  };

  const { error } = await supabase.from("ia_agent_events").insert({
    id: record.id,
    caso_id: record.caso_id,
    agente_ia_id: record.agente_ia_id,
    agente_ia_codigo: record.agente_ia_codigo,
    tipo_de_input: record.tipo_de_input,
    prioridad_operativa: record.prioridad_operativa,
    señales_detectadas: record.señales_detectadas,
    sugerencia_operativa: record.sugerencia_operativa,
    accion_recomendada_opcional: record.accion_recomendada_opcional,
    source: record.source,
    created_at: record.created_at,
  });

  if (error) {
    return {
      record: null,
      error: error.message,
    };
  }

  return {
    record,
    error: null,
  };
}
