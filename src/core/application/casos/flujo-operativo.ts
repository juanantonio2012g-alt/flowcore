import type { CasoDetalleNormalizado } from "@/core/domain/casos/detalle";
import type { EtapaCaso } from "@/core/domain/casos/workflow";

export type EtapaRealOpenCore = EtapaCaso | "validacion";
export type BloqueVisibleFlujo =
  | "Recepción"
  | "Análisis"
  | "Revisión"
  | "Aprobación"
  | "Cierre";

export type SiguienteAccionOperativa = {
  etapa_real_actual: EtapaRealOpenCore;
  bloque_visible: BloqueVisibleFlujo;
  href: string;
  label: string;
  bloqueada: boolean;
  motivo: string;
};

export const FLUJO_REAL_COMPLETO: EtapaRealOpenCore[] = [
  "solicitud",
  "recoleccion",
  "levantamiento",
  "informe",
  "diagnostico",
  "validacion",
  "cotizacion",
  "gestion_comercial",
  "logistica_entrega",
  "auditoria",
  "postventa",
  "cierre_tecnico",
  "cerrado",
];

export const ETAPAS_UI_ACTUALES: Array<{
  label: BloqueVisibleFlujo;
  etapas: EtapaRealOpenCore[];
}> = [
  { label: "Recepción", etapas: ["solicitud", "recoleccion"] },
  { label: "Análisis", etapas: ["levantamiento", "informe", "diagnostico"] },
  { label: "Revisión", etapas: ["validacion"] },
  { label: "Aprobación", etapas: ["cotizacion", "gestion_comercial"] },
  {
    label: "Cierre",
    etapas: ["logistica_entrega", "auditoria", "postventa", "cierre_tecnico", "cerrado"],
  },
];

function resolverBloqueVisible(etapa: EtapaRealOpenCore): BloqueVisibleFlujo {
  return (
    ETAPAS_UI_ACTUALES.find((bloque) => bloque.etapas.includes(etapa))?.label ??
    "Recepción"
  );
}

export function resolverEtapaRealActual(
  detalle: CasoDetalleNormalizado
): EtapaRealOpenCore {
  const metadata = detalle.estadoGlobal.metadata;
  const requiereValidacion = metadata.requiere_validacion;
  const validacionPendiente =
    metadata.validacion_pendiente ??
    (requiereValidacion && metadata.validacion_resuelta !== true);

  if (
    detalle.estadoGlobal.estado === "validacion" ||
    validacionPendiente === true
  ) {
    return "validacion";
  }

  return detalle.estadoGlobal.workflow.etapa_actual;
}

export function resolverSiguienteAccionOperativa(
  detalle: CasoDetalleNormalizado,
  etapaActual: EtapaRealOpenCore = resolverEtapaRealActual(detalle),
  inconsistencias: string[] = detalle.estadoGlobal.workflow.alineacion.alertas
): SiguienteAccionOperativa {
  const casoId = detalle.resumen.id;
  const continuidad = detalle.estadoGlobal.workflow.continuidad;
  const continuidadBloqueada =
    continuidad.estado === "vencida" ||
    continuidad.estado === "bloqueada" ||
    detalle.estadoGlobal.workflow.alineacion.continuidad_vs_workflow !== "alineada";
  const bloqueoTransicion =
    detalle.estadoGlobal.workflow.transiciones.actual?.bloqueos[0] ?? null;

  if (continuidadBloqueada) {
    return {
      etapa_real_actual: etapaActual,
      bloque_visible: resolverBloqueVisible(etapaActual),
      href: `/casos/${casoId}/seguimiento`,
      label:
        continuidad.estado === "vencida"
          ? "Actualizar continuidad vencida"
          : "Alinear continuidad",
      bloqueada: true,
      motivo:
        continuidad.motivo_espera ??
        "La continuidad debe alinearse antes de avanzar con seguridad.",
    };
  }

  if (bloqueoTransicion || inconsistencias.length > 0) {
    return {
      etapa_real_actual: etapaActual,
      bloque_visible: resolverBloqueVisible(etapaActual),
      href: `/casos/${casoId}`,
      label: "Resolver bloqueo operativo",
      bloqueada: true,
      motivo:
        bloqueoTransicion ??
        inconsistencias[0] ??
        "El workflow reporta una inconsistencia antes de permitir el avance.",
    };
  }

  switch (etapaActual) {
    case "solicitud":
    case "recoleccion":
    case "levantamiento":
    case "informe":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/informe`,
        label: "Registrar informe técnico",
        bloqueada: false,
        motivo: "El siguiente registro formal del tramo técnico es el informe.",
      };
    case "diagnostico":
    case "validacion":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/diagnostico`,
        label:
          etapaActual === "validacion"
            ? "Validar diagnóstico"
            : "Registrar diagnóstico",
        bloqueada: false,
        motivo: "El avance depende del diagnóstico y su validación cuando aplique.",
      };
    case "cotizacion":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/cotizacion`,
        label: "Emitir cotización",
        bloqueada: false,
        motivo: "El caso está listo para sostener el tramo de cotización.",
      };
    case "gestion_comercial":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/seguimiento`,
        label: "Dar seguimiento comercial",
        bloqueada: false,
        motivo: "La gestión comercial se registra en seguimiento.",
      };
    case "logistica_entrega":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/logistica`,
        label: "Coordinar entrega",
        bloqueada: false,
        motivo: "La siguiente operación corresponde al módulo de logística.",
      };
    case "auditoria":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/auditoria`,
        label: "Registrar auditoría",
        bloqueada: false,
        motivo: "La auditoría valida el tramo posterior a la entrega.",
      };
    case "postventa":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/postventa`,
        label: "Registrar postventa",
        bloqueada: false,
        motivo: "La postventa consolida conformidad y remanentes antes del cierre técnico.",
      };
    case "cierre_tecnico":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}/cierre-tecnico`,
        label: "Registrar cierre técnico",
        bloqueada: false,
        motivo: "El caso está en el tramo de cierre técnico.",
      };
    case "cerrado":
      return {
        etapa_real_actual: etapaActual,
        bloque_visible: resolverBloqueVisible(etapaActual),
        href: `/casos/${casoId}`,
        label: "Ver expediente cerrado",
        bloqueada: false,
        motivo: "El caso ya no requiere registro operativo adicional.",
      };
  }
}
