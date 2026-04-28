import type { MacroareaCaso } from "./types";

export type EtapaProcesoActual =
  | "solicitud"
  | "recoleccion"
  | "levantamiento"
  | "informe"
  | "diagnostico"
  | "cotizacion"
  | "gestion_comercial"
  | "logistica_entrega"
  | "auditoria"
  | "postventa"
  | "cierre_tecnico"
  | "cerrado";

export type EtapaVisibleProcesoActual = EtapaProcesoActual | "validacion";

export type WorkflowTransitionKeyProcesoActual =
  | "diagnostico_a_cotizacion"
  | "cotizacion_a_gestion_comercial"
  | "gestion_comercial_a_logistica"
  | "gestion_comercial_a_cierre"
  | "auditoria_a_postventa"
  | "postventa_a_cierre_tecnico";

export type FlujoTramoProcesoActualKey =
  | "entrada_control_inicial"
  | "informe"
  | "diagnostico"
  | "validacion"
  | "cotizacion"
  | "seguimiento"
  | "logistica"
  | "auditoria"
  | "postventa"
  | "cierre_tecnico";

type EtapaProcesoActualMeta = {
  etapa: EtapaProcesoActual;
  label: string;
  label_corta: string;
  soportada: boolean;
  owner_default: MacroareaCaso;
};

export type WorkflowTransitionRuleProcesoActual = {
  key: WorkflowTransitionKeyProcesoActual;
  label: string;
  origen: EtapaProcesoActual[];
  destino: EtapaProcesoActual;
  descripcion: string;
};

export type FlujoTramoProcesoActual = {
  key: FlujoTramoProcesoActualKey;
  label: string;
  etapas: EtapaVisibleProcesoActual[];
  responsable: MacroareaCaso;
};

export const ETAPAS_PROCESO_ACTUAL: readonly EtapaProcesoActualMeta[] = [
  {
    etapa: "solicitud",
    label: "Solicitud cliente",
    label_corta: "Solicitud",
    soportada: true,
    owner_default: "operaciones",
  },
  {
    etapa: "recoleccion",
    label: "Recolección de información",
    label_corta: "Recolección",
    soportada: false,
    owner_default: "operaciones",
  },
  {
    etapa: "levantamiento",
    label: "Levantamiento",
    label_corta: "Levantamiento",
    soportada: false,
    owner_default: "operaciones",
  },
  {
    etapa: "informe",
    label: "Informe técnico",
    label_corta: "Informe",
    soportada: true,
    owner_default: "tecnico",
  },
  {
    etapa: "diagnostico",
    label: "Diagnóstico",
    label_corta: "Diagnóstico",
    soportada: true,
    owner_default: "tecnico",
  },
  {
    etapa: "cotizacion",
    label: "Cotización",
    label_corta: "Cotización",
    soportada: true,
    owner_default: "comercial",
  },
  {
    etapa: "gestion_comercial",
    label: "Gestión comercial",
    label_corta: "Gestión comercial",
    soportada: true,
    owner_default: "comercial",
  },
  {
    etapa: "logistica_entrega",
    label: "Logística / entrega",
    label_corta: "Logística / entrega",
    soportada: true,
    owner_default: "administracion",
  },
  {
    etapa: "auditoria",
    label: "Auditoría",
    label_corta: "Auditoría",
    soportada: true,
    owner_default: "administracion",
  },
  {
    etapa: "postventa",
    label: "Servicio postventa",
    label_corta: "Postventa",
    soportada: true,
    owner_default: "administracion",
  },
  {
    etapa: "cierre_tecnico",
    label: "Cierre técnico",
    label_corta: "Cierre técnico",
    soportada: true,
    owner_default: "administracion",
  },
  {
    etapa: "cerrado",
    label: "Cerrado",
    label_corta: "Caso cerrado",
    soportada: true,
    owner_default: "administracion",
  },
] as const;

export const FLUJO_TRAMOS_PROCESO_ACTUAL: readonly FlujoTramoProcesoActual[] = [
  {
    key: "entrada_control_inicial",
    label: "Entrada / control inicial",
    etapas: ["solicitud", "recoleccion", "levantamiento"],
    responsable: "operaciones",
  },
  {
    key: "informe",
    label: "Informe",
    etapas: ["informe"],
    responsable: "tecnico",
  },
  {
    key: "diagnostico",
    label: "Diagnóstico",
    etapas: ["diagnostico"],
    responsable: "tecnico",
  },
  {
    key: "validacion",
    label: "Validación",
    etapas: ["validacion"],
    responsable: "tecnico",
  },
  {
    key: "cotizacion",
    label: "Cotización",
    etapas: ["cotizacion"],
    responsable: "comercial",
  },
  {
    key: "seguimiento",
    label: "Seguimiento",
    etapas: ["gestion_comercial"],
    responsable: "comercial",
  },
  {
    key: "logistica",
    label: "Logística",
    etapas: ["logistica_entrega"],
    responsable: "operaciones",
  },
  {
    key: "auditoria",
    label: "Auditoría",
    etapas: ["auditoria"],
    responsable: "administracion",
  },
  {
    key: "postventa",
    label: "Postventa",
    etapas: ["postventa"],
    responsable: "administracion",
  },
  {
    key: "cierre_tecnico",
    label: "Cierre técnico",
    etapas: ["cierre_tecnico", "cerrado"],
    responsable: "administracion",
  },
] as const;

export const TRANSITION_RULES_PROCESO_ACTUAL: readonly WorkflowTransitionRuleProcesoActual[] = [
  {
    key: "diagnostico_a_cotizacion",
    label: "Habilitar cotización",
    origen: ["diagnostico"],
    destino: "cotizacion",
    descripcion:
      "Controla si el diagnóstico técnico ya permite abrir formalmente la fase de cotización.",
  },
  {
    key: "cotizacion_a_gestion_comercial",
    label: "Activar gestión comercial",
    origen: ["cotizacion"],
    destino: "gestion_comercial",
    descripcion:
      "Expresa cuándo la cotización ya abrió una fase comercial estructural y no solo documental.",
  },
  {
    key: "gestion_comercial_a_logistica",
    label: "Confirmar aprobación comercial",
    origen: ["gestion_comercial"],
    destino: "logistica_entrega",
    descripcion:
      "Formaliza la transición estructural desde la gestión comercial hacia la etapa posterior a la aprobación.",
  },
  {
    key: "gestion_comercial_a_cierre",
    label: "Cerrar sin conversión",
    origen: ["gestion_comercial"],
    destino: "cerrado",
    descripcion:
      "Formaliza el cierre estructural cuando la gestión comercial termina sin conversión.",
  },
  {
    key: "auditoria_a_postventa",
    label: "Abrir postventa",
    origen: ["auditoria"],
    destino: "postventa",
    descripcion:
      "Formaliza la salida de auditoría conforme hacia un tramo operable de postventa previo al cierre técnico.",
  },
  {
    key: "postventa_a_cierre_tecnico",
    label: "Habilitar cierre técnico",
    origen: ["postventa"],
    destino: "cierre_tecnico",
    descripcion:
      "Formaliza que la postventa ya quedó resuelta y el cierre técnico puede ejecutarse como siguiente acto.",
  },
] as const;

const META_POR_ETAPA = new Map(
  ETAPAS_PROCESO_ACTUAL.map((item) => [item.etapa, item] as const)
);

const SIGUIENTE_MACROAREA_PROCESO_ACTUAL: Record<
  MacroareaCaso,
  MacroareaCaso | null
> = {
  operaciones: "tecnico",
  tecnico: "comercial",
  comercial: "administracion",
  administracion: null,
};

const TRANSICIONES_PRIORITARIAS_POR_ETAPA: Record<
  EtapaProcesoActual,
  WorkflowTransitionKeyProcesoActual[]
> = {
  solicitud: [],
  recoleccion: [],
  levantamiento: [],
  informe: [],
  diagnostico: ["diagnostico_a_cotizacion"],
  cotizacion: ["cotizacion_a_gestion_comercial", "diagnostico_a_cotizacion"],
  gestion_comercial: [
    "gestion_comercial_a_logistica",
    "gestion_comercial_a_cierre",
    "cotizacion_a_gestion_comercial",
  ],
  logistica_entrega: ["gestion_comercial_a_logistica"],
  auditoria: ["auditoria_a_postventa", "gestion_comercial_a_logistica"],
  postventa: ["postventa_a_cierre_tecnico", "auditoria_a_postventa"],
  cierre_tecnico: ["postventa_a_cierre_tecnico"],
  cerrado: [
    "gestion_comercial_a_cierre",
    "postventa_a_cierre_tecnico",
    "gestion_comercial_a_logistica",
  ],
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function includesAny(texto: string, pistas: readonly string[]) {
  return pistas.some((pista) => texto.includes(pista));
}

export function obtenerMetaEtapaProcesoActual(
  etapa: EtapaProcesoActual | null | undefined
) {
  if (!etapa) {
    return null;
  }

  return META_POR_ETAPA.get(etapa) ?? null;
}

export function labelEtapaProcesoActual(
  etapa: string | null | undefined,
  variante: "larga" | "corta" = "corta"
) {
  if (etapa === "validacion") {
    return "Validación";
  }

  const meta = obtenerMetaEtapaProcesoActual(
    etapa as EtapaProcesoActual | null | undefined
  );

  if (!meta) {
    return "Etapa activa";
  }

  return variante === "larga" ? meta.label : meta.label_corta;
}

export function obtenerOwnerEtapaProcesoActual(
  etapa: EtapaProcesoActual | null | undefined
): MacroareaCaso {
  return obtenerMetaEtapaProcesoActual(etapa)?.owner_default ?? "operaciones";
}

export function obtenerSiguienteMacroareaProcesoActual(area: MacroareaCaso) {
  return SIGUIENTE_MACROAREA_PROCESO_ACTUAL[area];
}

export function obtenerTransicionesPrioritariasPorEtapaProcesoActual(
  etapa: EtapaProcesoActual
) {
  return TRANSICIONES_PRIORITARIAS_POR_ETAPA[etapa];
}

export function clasificarAccionProcesoActual(
  accion: string | null | undefined
): EtapaProcesoActual | null {
  const normalizada = normalizarTexto(accion);

  if (!normalizada) return null;

  if (
    includesAny(normalizada, ["postventa", "garantia", "garant", "mantenimiento"])
  ) {
    return "postventa";
  }

  if (
    includesAny(normalizada, [
      "auditoria",
      "auditar",
      "gestionar correccion",
      "correccion pendiente",
      "resolver correccion",
      "corregir hallazgos",
    ])
  ) {
    return "auditoria";
  }

  if (includesAny(normalizada, ["caso tecnicamente cerrado", "cierre tecnico"])) {
    return "cierre_tecnico";
  }

  if (includesAny(normalizada, ["cierre administrativo"])) {
    return "postventa";
  }

  if (
    includesAny(normalizada, [
      "entrega",
      "logistica",
      "despacho",
      "instalacion",
      "confirmar programacion",
      "programar",
      "coordinar ejecucion",
      "coordinar con vendor",
    ])
  ) {
    return "logistica_entrega";
  }

  if (
    includesAny(normalizada, [
      "seguimiento",
      "cliente",
      "negoci",
      "aprobacion",
      "aprobaci",
      "propuesta",
    ])
  ) {
    return "gestion_comercial";
  }

  if (includesAny(normalizada, ["cotiz", "presupuesto", "propuesta economica"])) {
    return "cotizacion";
  }

  if (
    includesAny(normalizada, [
      "diagnostico",
      "validacion",
      "validar",
      "revision tecnica",
    ])
  ) {
    return "diagnostico";
  }

  if (includesAny(normalizada, ["informe", "hallazgo", "revision del informe"])) {
    return "informe";
  }

  if (includesAny(normalizada, ["levantamiento", "visita", "inspeccion"])) {
    return "levantamiento";
  }

  if (
    includesAny(normalizada, [
      "registro inicial",
      "contacto inicial",
      "control inicial",
      "recepcion",
      "recepcion de caso",
    ])
  ) {
    return "solicitud";
  }

  return null;
}
