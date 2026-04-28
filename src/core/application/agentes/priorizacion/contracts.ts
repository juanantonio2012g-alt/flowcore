export type AgentePriorizacionInput = {
  caso_id: string;
  accion_actual: string | null;
  accion_prioritaria_sistema: string | null;
  etapa_actual: string | null;
  estado_actual: string | null;
};

export type AgentePriorizacionAlineacion =
  | "alineada"
  | "parcial"
  | "desalineada"
  | "indeterminada";

export type AgentePriorizacionConfianza = "alta" | "media" | "baja";

export type AgentePriorizacionOutput = {
  caso_id: string;
  alineacion: AgentePriorizacionAlineacion;
  accion_prioritaria: string | null;
  motivo: string;
  orden_operativa?: string | null;
  confianza: AgentePriorizacionConfianza;
  fuente: "opencore.agente.priorizacion.determinista";
};
