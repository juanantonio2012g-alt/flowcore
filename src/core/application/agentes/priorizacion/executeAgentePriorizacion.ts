import type {
  AgentePriorizacionInput,
  AgentePriorizacionOutput,
} from "./contracts";

const STOPWORDS = new Set([
  "a",
  "al",
  "con",
  "de",
  "del",
  "el",
  "en",
  "la",
  "las",
  "los",
  "para",
  "por",
  "un",
  "una",
  "y",
]);

const FAMILIAS_OPERATIVAS = [
  {
    key: "seguimiento_contacto",
    keywords: ["seguimiento", "llamar", "contactar", "contacto", "comercial"],
  },
  {
    key: "programacion_logistica",
    keywords: [
      "programacion",
      "programar",
      "coordinar",
      "coordinacion",
      "logistica",
      "reprogramar",
    ],
  },
  {
    key: "entrega",
    keywords: ["entrega", "entregar"],
  },
  {
    key: "validacion_diagnostico",
    keywords: ["validacion", "validar", "diagnostico", "diagnosticar", "reformular"],
  },
  {
    key: "cotizacion",
    keywords: ["cotizacion", "cotizar"],
  },
  {
    key: "cierre_postventa",
    keywords: ["cierre", "cerrar", "postventa"],
  },
] as const;

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function tokenizar(valor: string | null | undefined) {
  return normalizarTexto(valor)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function interseccionTokens(a: string[], b: string[]) {
  const universo = new Set(b);
  return a.filter((token) => universo.has(token));
}

function derivarFamiliasOperativas(valor: string | null | undefined) {
  const texto = normalizarTexto(valor);
  const tokens = new Set(tokenizar(valor));

  return FAMILIAS_OPERATIVAS.filter(({ keywords }) =>
    keywords.some((keyword) => tokens.has(keyword) || texto.includes(keyword))
  ).map(({ key }) => key);
}

function construirContexto(input: AgentePriorizacionInput) {
  const partes = [input.etapa_actual, input.estado_actual]
    .map((valor) => normalizarTexto(valor))
    .filter(Boolean);

  return partes.length > 0 ? ` en ${partes.join(" / ")}` : "";
}

export function executeAgentePriorizacion(
  input: AgentePriorizacionInput
): AgentePriorizacionOutput {
  const accionActual = normalizarTexto(input.accion_actual);
  const accionPrioritaria = normalizarTexto(input.accion_prioritaria_sistema);
  const contexto = construirContexto(input);

  if (!accionPrioritaria) {
    return {
      caso_id: input.caso_id,
      alineacion: "indeterminada",
      accion_prioritaria: null,
      motivo:
        "No hay una acción prioritaria del sistema disponible para comparar la continuidad operativa actual.",
      orden_operativa: null,
      confianza: "baja",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  if (!accionActual) {
    return {
      caso_id: input.caso_id,
      alineacion: "desalineada",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `El caso no tiene una acción actual explícita${contexto} y conviene ordenar la continuidad alrededor de la prioridad detectada por el sistema.`,
      orden_operativa: input.accion_prioritaria_sistema,
      confianza: "alta",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  if (accionActual === accionPrioritaria) {
    return {
      caso_id: input.caso_id,
      alineacion: "alineada",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `La acción actual coincide con la prioridad operativa detectada por el sistema${contexto}.`,
      orden_operativa: null,
      confianza: "alta",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  if (accionActual.includes(accionPrioritaria)) {
    return {
      caso_id: input.caso_id,
      alineacion: "alineada",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `La acción actual acompaña la prioridad operativa detectada por el sistema${contexto} y la aterriza con mayor precisión operativa.`,
      orden_operativa: null,
      confianza: "alta",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  if (accionPrioritaria.includes(accionActual)) {
    return {
      caso_id: input.caso_id,
      alineacion: "parcial",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `La acción actual se acerca a la prioridad detectada${contexto}, pero todavía no la expresa con precisión suficiente.`,
      orden_operativa: input.accion_prioritaria_sistema,
      confianza: "media",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  const tokensActuales = tokenizar(input.accion_actual);
  const tokensPrioritarios = tokenizar(input.accion_prioritaria_sistema);
  const coincidencias = interseccionTokens(tokensActuales, tokensPrioritarios);

  if (coincidencias.length >= 2) {
    return {
      caso_id: input.caso_id,
      alineacion: "parcial",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `La acción actual comparte señales operativas con la prioridad detectada${contexto}, pero requiere una formulación más directa para evitar ambigüedad.`,
      orden_operativa: input.accion_prioritaria_sistema,
      confianza: "media",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  const familiasActuales = derivarFamiliasOperativas(input.accion_actual);
  const familiasPrioritarias = derivarFamiliasOperativas(
    input.accion_prioritaria_sistema
  );
  const familiasCompartidas = interseccionTokens(
    familiasActuales,
    familiasPrioritarias
  );

  if (familiasCompartidas.length > 0) {
    return {
      caso_id: input.caso_id,
      alineacion: "parcial",
      accion_prioritaria: input.accion_prioritaria_sistema,
      motivo: `La acción actual pertenece a la misma familia operativa que la prioridad detectada${contexto}, pero todavía conviene formularla de manera más directa para orientar mejor la continuidad.`,
      orden_operativa: input.accion_prioritaria_sistema,
      confianza: "media",
      fuente: "opencore.agente.priorizacion.determinista",
    };
  }

  return {
    caso_id: input.caso_id,
    alineacion: "desalineada",
    accion_prioritaria: input.accion_prioritaria_sistema,
    motivo: `La acción actual no acompaña la prioridad operativa detectada por el sistema${contexto}.`,
    orden_operativa: input.accion_prioritaria_sistema,
    confianza: "alta",
    fuente: "opencore.agente.priorizacion.determinista",
  };
}
