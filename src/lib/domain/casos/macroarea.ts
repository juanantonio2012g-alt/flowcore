import type { MacroareaCaso } from "./types";
import {
  clasificarAccionProcesoActual,
  obtenerSiguienteMacroareaProcesoActual,
} from "./proceso-actual";

type DerivarMacroareaInput = {
  estadoTecnicoReal: string;
  estadoComercialReal: string;
  proximaAccionReal: string;
  proximaFechaReal: string | null;
  requiereValidacion: boolean;
};

type MacroareaMeta = {
  label: string;
  orden: number;
};

export type MacroareaDerivada = {
  actual: MacroareaCaso;
  siguiente: MacroareaCaso | null;
  label: string;
  orden: number;
  motivo: string;
};

const MACROAREA_META: Record<MacroareaCaso, MacroareaMeta> = {
  operaciones: { label: "Operaciones", orden: 1 },
  tecnico: { label: "Técnico", orden: 2 },
  comercial: { label: "Comercial", orden: 3 },
  administracion: { label: "Administración / Soporte", orden: 4 },
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function meta(area: MacroareaCaso) {
  return MACROAREA_META[area];
}

function detectarSenalTecnicaDirecta(accion: string): boolean {
  const normalizada = accion
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  
  return (
    normalizada.includes("falla") ||
    normalizada.includes("dano") || // sin tilde
    normalizada.includes("daño") ||
    normalizada.includes("problema") ||
    normalizada.includes("no funciona") ||
    normalizada.includes("humedad") ||
    normalizada.includes("revision") || // sin tilde
    normalizada.includes("revisión") ||
    normalizada.includes("reparacion") || // sin tilde
    normalizada.includes("reparación") ||
    normalizada.includes("defecto") ||
    normalizada.includes("malfunction")
  );
}

function macroareaDesdeEtapaAccion(
  etapaAccion: ReturnType<typeof clasificarAccionProcesoActual>
): MacroareaCaso | null {
  switch (etapaAccion) {
    case "auditoria":
      return "administracion";
    case "informe":
    case "diagnostico":
    case "levantamiento":
      return "tecnico";
    case "cotizacion":
    case "gestion_comercial":
      return "comercial";
    case "logistica_entrega":
      return "operaciones";
    case "postventa":
      return "administracion";
    default:
      return null;
  }
}

function armar(area: MacroareaCaso, motivo: string): MacroareaDerivada {
  const areaMeta = meta(area);
  return {
    actual: area,
    siguiente: obtenerSiguienteMacroareaProcesoActual(area),
    label: areaMeta.label,
    orden: areaMeta.orden,
    motivo,
  };
}

export function derivarMacroareaCaso(args: DerivarMacroareaInput): MacroareaDerivada {
  const estadoTecnico = normalizarTexto(args.estadoTecnicoReal);
  const estadoComercial = normalizarTexto(args.estadoComercialReal);
  const accion = normalizarTexto(args.proximaAccionReal);
  const etapaAccion = clasificarAccionProcesoActual(accion);
  const sinAccion =
    !accion || accion === "sin proxima accion" || accion === "caso en seguimiento";
  const macroareaRuta = sinAccion ? null : macroareaDesdeEtapaAccion(etapaAccion);
  const sinFecha = !args.proximaFechaReal;
  const continuidadIncompleta = sinAccion || sinFecha;
  const tieneSenalTecnicaDirecta = !sinAccion && detectarSenalTecnicaDirecta(accion);

  if (args.requiereValidacion) {
    return armar(
      "tecnico",
      "El caso requiere validación técnica y atención especialista."
    );
  }

  // Detectar señales técnicas directas en la próxima acción (falla, daño, problema, etc.)
  if (tieneSenalTecnicaDirecta) {
    return armar(
      "tecnico",
      "Próxima acción contiene señal técnica clara (falla, daño, problema o similar)."
    );
  }

  if (macroareaRuta && macroareaRuta !== "tecnico") {
    return armar(
      macroareaRuta,
      sinFecha
        ? "La continuidad ya abrió una ruta operativa posterior a diagnóstico, aunque todavía falte completar la fecha."
        : "La continuidad vigente ya empuja el caso hacia una macroárea posterior al tramo técnico inicial."
    );
  }

  if (
    estadoTecnico === "informe_recibido" ||
    estadoTecnico === "informe_tecnico_recibido" ||
    estadoTecnico === "diagnosticado" ||
    etapaAccion === "informe" ||
    etapaAccion === "diagnostico" ||
    etapaAccion === "levantamiento"
  ) {
    return armar(
      "tecnico",
      "El caso está bajo trabajo técnico (informe, diagnóstico o validación)."
    );
  }

  if (macroareaRuta && sinAccion === false && sinFecha) {
    return armar(
      macroareaRuta,
      "La continuidad ya define una ruta operativa valida, aunque todavia falte completar la fecha."
    );
  }

  if (continuidadIncompleta) {
    return armar(
      "operaciones",
      "El caso está en coordinación operativa inicial, ambiguo o sin continuidad clara definida."
    );
  }

  if (
    estadoComercial === "aprobado" ||
    estadoComercial === "rechazado" ||
    estadoComercial === "pausado"
  ) {
    return armar(
      "administracion",
      "El caso está en fase de cierre, soporte o contención administrativa."
    );
  }

  if (
    estadoTecnico === "solucion_definida" ||
    estadoComercial === "sin_cotizar" ||
    estadoComercial === "en_proceso" ||
    estadoComercial === "negociacion" ||
    estadoComercial === "cotizado" ||
    estadoComercial === "esperando_cliente" ||
    etapaAccion === "cotizacion" ||
    etapaAccion === "gestion_comercial"
  ) {
    return armar(
      "comercial",
      "El caso está en movimiento comercial (cotización, negociación o seguimiento)."
    );
  }

  return armar(
    "operaciones",
    "El caso está en coordinación operativa inicial y control de flujo."
  );
}

export function obtenerMetaMacroarea(area: MacroareaCaso): MacroareaMeta {
  return meta(area);
}
