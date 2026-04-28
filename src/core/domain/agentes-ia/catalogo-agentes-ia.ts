import type { MacroareaCaso } from "@/lib/domain/casos";

export const AGENTE_IA_NOMBRE = "IA agent" as const;

export type AgenteIAMacroarea = MacroareaCaso | "general";

export type AgenteIAOperativo = {
  id: string;
  codigo:
    | "ia-agent-general"
    | "ia-agent-operaciones"
    | "ia-agent-tecnico"
    | "ia-agent-comercial"
    | "ia-agent-administracion";
  nombre: typeof AGENTE_IA_NOMBRE;
  macroarea_base: AgenteIAMacroarea;
  synthetic: true;
  active: boolean;
  tipo_registro: "system_agent";
  rol: string;
  capacidades: string[];
};

export type EnrutamientoAgenteIA = {
  orquestador: AgenteIAOperativo;
  activo: AgenteIAOperativo;
};

const CATALOGO_AGENTES_IA: AgenteIAOperativo[] = [
  {
    id: "ia-00000000-0000-4000-8000-000000000001",
    codigo: "ia-agent-general",
    nombre: AGENTE_IA_NOMBRE,
    macroarea_base: "general",
    synthetic: true,
    active: true,
    tipo_registro: "system_agent",
    rol: "Canalizador central del caso",
    capacidades: [
      "Recibe el caso y detecta la macroarea objetivo",
      "Deriva el caso al agente IA operativo correspondiente",
      "Prepara el contexto minimo para automatizaciones futuras",
    ],
  },
  {
    id: "ia-00000000-0000-4000-8000-000000000002",
    codigo: "ia-agent-operaciones",
    nombre: AGENTE_IA_NOMBRE,
    macroarea_base: "operaciones",
    synthetic: true,
    active: true,
    tipo_registro: "system_agent",
    rol: "Apoyo operativo de operaciones",
    capacidades: [
      "Revisa input inicial",
      "Detecta faltantes de entrada",
      "Prepara continuidad inicial",
      "Apoya coordinacion logistica",
    ],
  },
  {
    id: "ia-00000000-0000-4000-8000-000000000003",
    codigo: "ia-agent-tecnico",
    nombre: AGENTE_IA_NOMBRE,
    macroarea_base: "tecnico",
    synthetic: true,
    active: true,
    tipo_registro: "system_agent",
    rol: "Apoyo tecnico del expediente",
    capacidades: [
      "Revisa informe y diagnostico",
      "Detecta inconsistencias tecnicas",
      "Sugiere validacion",
      "Prepara criterio tecnico base",
    ],
  },
  {
    id: "ia-00000000-0000-4000-8000-000000000004",
    codigo: "ia-agent-comercial",
    nombre: AGENTE_IA_NOMBRE,
    macroarea_base: "comercial",
    synthetic: true,
    active: true,
    tipo_registro: "system_agent",
    rol: "Apoyo comercial del caso",
    capacidades: [
      "Monitorea cotizaciones",
      "Detecta propuestas sin seguimiento",
      "Sugiere proxima gestion",
      "Alerta decisiones comerciales pendientes",
    ],
  },
  {
    id: "ia-00000000-0000-4000-8000-000000000005",
    codigo: "ia-agent-administracion",
    nombre: AGENTE_IA_NOMBRE,
    macroarea_base: "administracion",
    synthetic: true,
    active: true,
    tipo_registro: "system_agent",
    rol: "Apoyo administrativo y de soporte",
    capacidades: [
      "Revisa auditoria",
      "Monitorea postventa",
      "Detecta cierres tecnicos faltantes",
      "Alerta casos sin cierre formal",
    ],
  },
];

export function obtenerCatalogoAgentesIA(): AgenteIAOperativo[] {
  return [...CATALOGO_AGENTES_IA];
}

export function obtenerAgentesIAActivos(): AgenteIAOperativo[] {
  return CATALOGO_AGENTES_IA.filter((agente) => agente.active);
}

export function obtenerAgenteIAOrquestador(): AgenteIAOperativo {
  const agente = obtenerAgentesIAActivos().find(
    (item) => item.macroarea_base === "general"
  );

  if (!agente) {
    throw new Error("No existe un agente IA general activo en OpenCore.");
  }

  return agente;
}

export function obtenerAgenteIAActivoPorMacroarea(
  macroarea: MacroareaCaso | null | undefined
): AgenteIAOperativo {
  const agenteEspecifico = obtenerAgentesIAActivos().find(
    (item) => item.macroarea_base === macroarea
  );

  return agenteEspecifico ?? obtenerAgenteIAOrquestador();
}

export function resolverEnrutamientoAgenteIA(
  macroarea: MacroareaCaso | null | undefined
): EnrutamientoAgenteIA {
  return {
    orquestador: obtenerAgenteIAOrquestador(),
    activo: obtenerAgenteIAActivoPorMacroarea(macroarea),
  };
}
