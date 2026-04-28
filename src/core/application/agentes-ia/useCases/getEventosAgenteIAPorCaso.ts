import { listEventosAgenteIAPorCaso } from "@/core/domain/agentes-ia";
import type { EventoAgenteIAPersistido } from "@/core/domain/agentes-ia";
import type {
  EventoAgenteIAHistoricoItem,
  EventosAgenteIAPorCasoReadModel,
} from "../contracts";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type GetEventosAgenteIAPorCasoOptions = {
  limit?: number;
};

function resolverLimit(limit?: number) {
  if (typeof limit === "undefined") {
    return DEFAULT_LIMIT;
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("limit debe ser un entero positivo");
  }

  return Math.min(limit, MAX_LIMIT);
}

function serializarEvento(
  evento: EventoAgenteIAPersistido
): EventoAgenteIAHistoricoItem {
  return {
    agente_ia_id: evento.agente_ia_id,
    agente_ia_codigo: evento.agente_ia_codigo,
    tipo_de_input: evento.tipo_de_input,
    prioridad_operativa: evento.prioridad_operativa,
    señales_detectadas: evento.señales_detectadas,
    sugerencia_operativa: evento.sugerencia_operativa,
    accion_recomendada_opcional: evento.accion_recomendada_opcional,
    source: evento.source,
    created_at: evento.created_at,
  };
}

export async function getEventosAgenteIAPorCaso(
  casoId: string,
  options: GetEventosAgenteIAPorCasoOptions = {}
): Promise<EventosAgenteIAPorCasoReadModel> {
  if (!casoId) {
    throw new Error("casoId es obligatorio");
  }

  const limit = resolverLimit(options.limit);
  const eventos = await listEventosAgenteIAPorCaso(casoId, { limit });

  return {
    caso_id: casoId,
    eventos: eventos.map(serializarEvento),
    total: eventos.length,
    generated_at: new Date().toISOString(),
  };
}

