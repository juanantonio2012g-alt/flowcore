type PrioridadInicial = "urgente" | "alta" | "media" | "baja" | null;

export type ClasificacionInicialInput = {
  descripcion: string | null | undefined;
  canal?: string | null | undefined;
  prioridad?: PrioridadInicial | undefined;
};

export type ClasificacionInicialGrupo =
  | "tecnico"
  | "comercial"
  | "logistica"
  | "postventa"
  | "ambiguo";

export type ClasificacionInicialOutput = {
  grupo: ClasificacionInicialGrupo;
  tipo_solicitud: "diagnostico" | "seguimiento" | "servicio" | "postventa";
  proxima_accion: string;
  motivo: string;
  foco_inicial?: string | null;
  confianza: "alta" | "media" | "baja";
  fuente: "opencore.clasificacion_inicial.determinista";
};

type ReglaClasificacion = {
  grupo: Exclude<ClasificacionInicialGrupo, "ambiguo">;
  tipo_solicitud: ClasificacionInicialOutput["tipo_solicitud"];
  proxima_accion: string;
  foco_inicial: string;
  motivo: string;
  keywords: string[];
  min_coincidencias?: number;
};

const REGLAS_CLASIFICACION: ReglaClasificacion[] = [
  {
    grupo: "postventa",
    tipo_solicitud: "postventa",
    proxima_accion: "Registrar seguimiento postventa",
    foco_inicial: "postventa",
    motivo:
      "La descripción inicial habla de cierre, conformidad o seguimiento posterior a la entrega.",
    keywords: [
      "postventa",
      "cierre tecnico",
      "cerrar tecnicamente",
      "conformidad final",
      "visita de postventa",
      "ya fue entregada",
      "ya fue entregado",
    ],
  },
  {
    grupo: "logistica",
    tipo_solicitud: "servicio",
    proxima_accion: "Confirmar programación",
    foco_inicial: "logistica_entrega",
    motivo:
      "La descripción inicial ya ubica el caso en programación, coordinación o entrega.",
    keywords: [
      "programacion",
      "programar",
      "vendor",
      "coordinar entrega",
      "coordinar ejecucion",
      "ventana operativa",
      "entrega",
      "fecha de entrega",
      "ejecucion",
      "coordinar",
    ],
  },
  {
    grupo: "comercial",
    tipo_solicitud: "seguimiento",
    proxima_accion: "Dar seguimiento comercial",
    foco_inicial: "gestion_comercial",
    motivo:
      "La descripción inicial muestra definición pendiente del cliente o continuidad comercial abierta.",
    keywords: [
      "compras",
      "propuesta",
      "cotizacion",
      "contactemos nuevamente",
      "contactemos",
      "dar seguimiento",
      "retomar",
      "respuesta del cliente",
      "revisarla",
      "revisarlo",
    ],
    min_coincidencias: 2,
  },
  {
    grupo: "tecnico",
    tipo_solicitud: "diagnostico",
    proxima_accion: "Realizar diagnóstico",
    foco_inicial: "tecnico",
    motivo:
      "La descripción inicial contiene síntomas o lenguaje de patología técnica que requieren análisis.",
    keywords: [
      "humedad",
      "filtracion",
      "grieta",
      "fisura",
      "desprendimiento",
      "falla",
      "patologia",
      "diagnostico",
      "inspeccion tecnica",
      "superficie",
    ],
  },
];

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function contarCoincidencias(texto: string, keywords: string[]) {
  return keywords.reduce(
    (total, keyword) => total + (texto.includes(normalizarTexto(keyword)) ? 1 : 0),
    0
  );
}

function pareceDescripcionAmbigua(texto: string) {
  return (
    texto.includes("no esta claro") ||
    texto.includes("revisemos opciones") ||
    texto.includes("revisar opciones") ||
    texto.includes("evaluar opciones")
  );
}

export function clasificarCasoInicial(
  input: ClasificacionInicialInput
): ClasificacionInicialOutput {
  const descripcion = normalizarTexto(input.descripcion);

  if (!descripcion || pareceDescripcionAmbigua(descripcion)) {
    return {
      grupo: "ambiguo",
      tipo_solicitud: "servicio",
      proxima_accion: "Definir próxima acción y fecha",
      motivo:
        "La descripción inicial no aporta señales suficientes o declara ambigüedad explícita para orientar el nacimiento del caso hacia un flujo específico.",
      foco_inicial: "ambigua",
      confianza: "baja",
      fuente: "opencore.clasificacion_inicial.determinista",
    };
  }

  const mejorRegla = REGLAS_CLASIFICACION
    .map((regla) => ({
      regla,
      coincidencias: contarCoincidencias(descripcion, regla.keywords),
    }))
    .sort((a, b) => b.coincidencias - a.coincidencias)[0];

  if (!descripcion || !mejorRegla || mejorRegla.coincidencias === 0) {
    return {
      grupo: "ambiguo",
      tipo_solicitud: "servicio",
      proxima_accion: "Definir próxima acción y fecha",
      motivo:
        "La descripción inicial no aporta señales suficientes para orientar el nacimiento del caso hacia un flujo específico.",
      foco_inicial: "ambigua",
      confianza: "baja",
      fuente: "opencore.clasificacion_inicial.determinista",
    };
  }

  const minCoincidencias = mejorRegla.regla.min_coincidencias ?? 1;

  if (mejorRegla.coincidencias < minCoincidencias) {
    return {
      grupo: "ambiguo",
      tipo_solicitud: "servicio",
      proxima_accion: "Definir próxima acción y fecha",
      motivo:
        "La descripción inicial solo aporta una señal débil y todavía no justifica orientar el caso hacia un flujo específico.",
      foco_inicial: "ambigua",
      confianza: "baja",
      fuente: "opencore.clasificacion_inicial.determinista",
    };
  }

  return {
    grupo: mejorRegla.regla.grupo,
    tipo_solicitud: mejorRegla.regla.tipo_solicitud,
    proxima_accion: mejorRegla.regla.proxima_accion,
    motivo: mejorRegla.regla.motivo,
    foco_inicial: mejorRegla.regla.foco_inicial,
    confianza: mejorRegla.coincidencias >= 2 ? "alta" : "media",
    fuente: "opencore.clasificacion_inicial.determinista",
  };
}
