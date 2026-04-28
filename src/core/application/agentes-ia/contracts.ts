import type { EventoAgenteIAPersistido } from "@/core/domain/agentes-ia";

export type EventoAgenteIAHistoricoItem = Pick<
  EventoAgenteIAPersistido,
  | "agente_ia_id"
  | "agente_ia_codigo"
  | "tipo_de_input"
  | "prioridad_operativa"
  | "señales_detectadas"
  | "sugerencia_operativa"
  | "accion_recomendada_opcional"
  | "source"
  | "created_at"
>;

export type EventosAgenteIAPorCasoReadModel = {
  caso_id: string;
  eventos: EventoAgenteIAHistoricoItem[];
  total: number;
  generated_at: string;
};

