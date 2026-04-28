import type { CasoWorklistItem } from "@/core/application/casos";
import { labelEtapaProcesoActual } from "@/lib/domain/casos/proceso-actual";
import type { OrganigramaEstadoContexto } from "./contracts";

export type SemanticaCasoOperativo = {
  etapa: string | null;
  etapa_label: string;
  accion_actual: string;
  estado_contexto: OrganigramaEstadoContexto;
  estado_contexto_label: string;
};

export function labelEtapaOperativa(etapa: string | null | undefined) {
  return labelEtapaProcesoActual(etapa, "corta");
}

export function derivarEstadoContextoCaso(
  caso: Pick<
    CasoWorklistItem,
    | "workflow_continuidad_estado"
    | "workflow_alineacion_sla"
    | "workflow_transicion_estado"
  >
): OrganigramaEstadoContexto {
  if (
    caso.workflow_continuidad_estado === "bloqueada" ||
    caso.workflow_continuidad_estado === "vencida" ||
    caso.workflow_alineacion_sla === "inconsistente" ||
    caso.workflow_transicion_estado === "bloqueada"
  ) {
    return "incidencia";
  }

  return "normal";
}

export function labelEstadoContextoOperativo(
  estado: OrganigramaEstadoContexto
) {
  return estado === "incidencia"
    ? "Incidencia operativa"
    : "Fase normal del flujo";
}

export function derivarSemanticaCasoOperativo(
  caso: Pick<
    CasoWorklistItem,
    | "workflow_etapa_actual"
    | "proxima_accion_real"
    | "workflow_continuidad_estado"
    | "workflow_alineacion_sla"
    | "workflow_transicion_estado"
  >
): SemanticaCasoOperativo {
  const estado_contexto = derivarEstadoContextoCaso(caso);

  return {
    etapa: caso.workflow_etapa_actual ?? null,
    etapa_label: labelEtapaOperativa(caso.workflow_etapa_actual),
    accion_actual: caso.proxima_accion_real ?? "Sin próxima acción",
    estado_contexto,
    estado_contexto_label: labelEstadoContextoOperativo(estado_contexto),
  };
}
