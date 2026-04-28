import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventoAgenteIAPersistido } from "./persistEventoAgenteIA";

type ListEventosAgenteIAPorCasoOptions = {
  limit?: number;
  supabase?: SupabaseClient;
};

export async function listEventosAgenteIAPorCaso(
  casoId: string,
  options: ListEventosAgenteIAPorCasoOptions = {}
): Promise<EventoAgenteIAPersistido[]> {
  if (!casoId) {
    throw new Error("casoId es obligatorio");
  }

  const { limit = 50 } = options;
  const supabase = options.supabase ?? createServerSupabaseClient();

  const { data, error } = await supabase
    .from("ia_agent_events")
    .select("*")
    .eq("caso_id", casoId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data as EventoAgenteIAPersistido[] | null) ?? [];
}

export type { ListEventosAgenteIAPorCasoOptions };
