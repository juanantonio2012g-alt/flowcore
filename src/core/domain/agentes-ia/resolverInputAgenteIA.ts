import type { CasoNormalizado } from "@/core/domain/casos";
import {
  resolverEnrutamientoAgenteIA,
  type AgenteIAOperativo,
} from "./catalogo-agentes-ia";

export type TipoInputAgenteIA =
  | "entrada_incompleta"
  | "validacion_pendiente"
  | "continuidad_vencida"
  | "seguimiento_requerido"
  | "asignacion_requerida"
  | "cierre_pendiente"
  | "sin_alerta";

export type PrioridadOperativaIA = "baja" | "media" | "alta" | "critica";

export type SugerenciaOperativaIA = {
  resumen: string;
  motivo: string;
  requiere_supervision_humana: boolean;
  fecha_sugerida: string | null;
};

export type InputResueltoAgenteIA = {
  orquestador: AgenteIAOperativo;
  agente_ia_activo: AgenteIAOperativo;
  tipo_de_input: TipoInputAgenteIA;
  prioridad_operativa: PrioridadOperativaIA;
  señales_detectadas: string[];
  sugerencia_operativa: SugerenciaOperativaIA;
  accion_recomendada_opcional: string | null;
};

function tieneTexto(valor: string | null | undefined) {
  return Boolean((valor ?? "").trim());
}

function deduplicarSenales(senales: string[]) {
  return [...new Set(senales.filter(Boolean))];
}

function buildSugerencia(
  caso: CasoNormalizado,
  resumen: string,
  motivo: string
): SugerenciaOperativaIA {
  return {
    resumen,
    motivo,
    requiere_supervision_humana: true,
    fecha_sugerida: caso.recomendacion_operativa.fecha_sugerida,
  };
}

export function resolverInputAgenteIA(
  caso: CasoNormalizado
): InputResueltoAgenteIA {
  const enrutamiento = resolverEnrutamientoAgenteIA(caso.macroarea_actual);
  const continuidad = caso.workflow.continuidad;
  const alineacion = caso.workflow.alineacion;
  const tieneProximaAccion = tieneTexto(caso.proxima_accion);
  const tieneProximaFecha = Boolean(caso.proxima_fecha);
  const validacionPendiente =
    caso.metadata.validacion_pendiente ??
    (caso.metadata.requiere_validacion &&
      caso.metadata.validacion_resuelta !== true);
  const senales: string[] = [];

  if (!tieneProximaAccion) senales.push("sin_proxima_accion");
  if (!tieneProximaFecha) senales.push("sin_proxima_fecha");
  if (continuidad.estado === "vencida") senales.push("continuidad_vencida");
  if (continuidad.estado === "bloqueada") senales.push("continuidad_bloqueada");
  if (alineacion.continuidad_vs_workflow !== "alineada") {
    senales.push("continuidad_desalineada");
  }
  if (alineacion.alertas.length > 0) {
    senales.push("workflow_con_alertas");
  }
  if (validacionPendiente) {
    senales.push("validacion_pendiente");
  }
  if (
    caso.workflow.etapa_actual === "postventa" ||
    caso.workflow.etapa_actual === "cierre_tecnico"
  ) {
    senales.push("tramo_de_cierre_activo");
  }
  if (
    caso.workflow.etapa_actual === "solicitud" ||
    caso.workflow.etapa_actual === "informe" ||
    caso.workflow.etapa_actual === "diagnostico"
  ) {
    senales.push("tramo_inicial_en_revision");
  }

  if (
    continuidad.estado === "vencida" ||
    continuidad.estado === "bloqueada"
  ) {
    return {
      orquestador: enrutamiento.orquestador,
      agente_ia_activo: enrutamiento.activo,
      tipo_de_input: "continuidad_vencida",
      prioridad_operativa: "critica",
      señales_detectadas: deduplicarSenales(senales),
      sugerencia_operativa: buildSugerencia(
        caso,
        "La continuidad operativa requiere intervención prioritaria.",
        continuidad.motivo_espera ??
          "El caso perdió continuidad efectiva y necesita reencauzarse antes de cualquier automatización posterior."
      ),
      accion_recomendada_opcional:
        caso.recomendacion_operativa.accion || "Actualizar continuidad",
    };
  }

  if (validacionPendiente) {
    return {
      orquestador: enrutamiento.orquestador,
      agente_ia_activo: enrutamiento.activo,
      tipo_de_input: "validacion_pendiente",
      prioridad_operativa: "alta",
      señales_detectadas: deduplicarSenales(senales),
      sugerencia_operativa: buildSugerencia(
        caso,
        "Hay una validación pendiente que condiciona el avance del caso.",
        caso.recomendacion_operativa.motivo
      ),
      accion_recomendada_opcional: caso.recomendacion_operativa.accion,
    };
  }

  if (
    (!tieneProximaAccion && !tieneProximaFecha) ||
    (caso.macroarea_actual === "administracion" &&
      (!tieneProximaAccion || !tieneProximaFecha))
  ) {
    return {
      orquestador: enrutamiento.orquestador,
      agente_ia_activo: enrutamiento.activo,
      tipo_de_input: "entrada_incompleta",
      prioridad_operativa: caso.riesgo === "alto" ? "alta" : "media",
      señales_detectadas: deduplicarSenales(senales),
      sugerencia_operativa: buildSugerencia(
        caso,
        "El caso necesita completar su continuidad operativa base.",
        caso.metadata.macroarea_motivo ||
          "Faltan datos mínimos para sostener el siguiente paso operativo."
      ),
      accion_recomendada_opcional: caso.recomendacion_operativa.accion,
    };
  }

  if (
    caso.workflow.etapa_actual === "postventa" ||
    caso.workflow.etapa_actual === "cierre_tecnico"
  ) {
    return {
      orquestador: enrutamiento.orquestador,
      agente_ia_activo: enrutamiento.activo,
      tipo_de_input: "cierre_pendiente",
      prioridad_operativa: "alta",
      señales_detectadas: deduplicarSenales(senales),
      sugerencia_operativa: buildSugerencia(
        caso,
        "El caso está en tramo de cierre y requiere control formal.",
        caso.recomendacion_operativa.motivo
      ),
      accion_recomendada_opcional: caso.recomendacion_operativa.accion,
    };
  }

  if (
    !tieneProximaAccion ||
    !tieneProximaFecha ||
    continuidad.estado === "pendiente" ||
    continuidad.estado === "en_espera"
  ) {
    return {
      orquestador: enrutamiento.orquestador,
      agente_ia_activo: enrutamiento.activo,
      tipo_de_input: "seguimiento_requerido",
      prioridad_operativa:
        caso.riesgo === "alto" || continuidad.estado === "pendiente"
          ? "alta"
          : "media",
      señales_detectadas: deduplicarSenales(senales),
      sugerencia_operativa: buildSugerencia(
        caso,
        "Conviene sostener seguimiento operativo visible.",
        caso.recomendacion_operativa.motivo
      ),
      accion_recomendada_opcional: caso.recomendacion_operativa.accion,
    };
  }

  return {
    orquestador: enrutamiento.orquestador,
    agente_ia_activo: enrutamiento.activo,
    tipo_de_input: "sin_alerta",
    prioridad_operativa:
      caso.recomendacion_operativa.urgencia === "alta"
        ? "media"
        : caso.recomendacion_operativa.urgencia,
    señales_detectadas: deduplicarSenales([
      ...senales,
      "continuidad_controlada",
    ]),
    sugerencia_operativa: buildSugerencia(
      caso,
      "El caso no presenta alertas críticas inmediatas.",
      "La lectura operativa actual permite mantener seguimiento estructurado sin intervención automática."
    ),
    accion_recomendada_opcional: null,
  };
}
