import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  InputResueltoAgenteIA,
  SugerenciaOperativaIA,
  TipoInputAgenteIA,
  PrioridadOperativaIA,
} from "./resolverInputAgenteIA";

export type EventoAgenteIA = {
  caso_id: string;
  agente_ia_id: string;
  agente_ia_codigo: string;
  tipo_de_input: TipoInputAgenteIA;
  prioridad_operativa: PrioridadOperativaIA;
  señales_detectadas: string[];
  sugerencia_operativa: SugerenciaOperativaIA;
  accion_recomendada_opcional: string | null;
  created_at: string;
  source: "ia_agent";
};

function deduplicarSenales(senales: string[]) {
  return [...new Set(senales.filter(Boolean))];
}

export function buildEventoAgenteIA(
  caso: CasoNormalizado,
  inputResuelto: InputResueltoAgenteIA
): EventoAgenteIA {
  return {
    caso_id: caso.id,
    agente_ia_id: inputResuelto.agente_ia_activo.id,
    agente_ia_codigo: inputResuelto.agente_ia_activo.codigo,
    tipo_de_input: inputResuelto.tipo_de_input,
    prioridad_operativa: inputResuelto.prioridad_operativa,
    señales_detectadas: deduplicarSenales(inputResuelto.señales_detectadas),
    sugerencia_operativa: inputResuelto.sugerencia_operativa,
    accion_recomendada_opcional: inputResuelto.accion_recomendada_opcional,
    created_at: new Date().toISOString(),
    source: "ia_agent",
  };
}
