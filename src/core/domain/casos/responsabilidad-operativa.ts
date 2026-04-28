import type { MacroareaCaso } from "@/lib/domain/casos";
import {
  AGENTE_IA_NOMBRE,
  resolverEnrutamientoAgenteIA,
  type AgenteIAOperativo,
} from "@/core/domain/agentes-ia/catalogo-agentes-ia";

export const AGENTE_OPERATIVO_ACTIVO = AGENTE_IA_NOMBRE;

export type ResponsabilidadOperativaCaso = {
  macroarea_actual: MacroareaCaso | null;
  macroarea_label: string;
  responsable_actual_raw: string | null;
  responsable_humano_id: string | null;
  responsable_humano: string | null;
  responsable_humano_label: string;
  responsable_humano_asignado_por: string | null;
  responsable_humano_asignado_at: string | null;
  agente_ia_activo: AgenteIAOperativo;
  agente_operativo_activo: typeof AGENTE_OPERATIVO_ACTIVO;
};

const MACROAREA_LABELS: Record<MacroareaCaso, string> = {
  operaciones: "Operaciones",
  tecnico: "Técnico",
  comercial: "Comercial",
  administracion: "Administración",
};

const VALORES_NO_HUMANOS = new Set([
  "administracion",
  "area administracion",
  "area administrativa",
  "area comercial",
  "area operaciones",
  "area tecnica",
  "comercial",
  "ia agent",
  "agente ia",
  "operaciones",
  "opencore",
  "sistema",
  "tecnico",
]);

function textoONull(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim().replace(/\s+/g, " ");
  return limpio || null;
}

function claveSemantica(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function labelMacroareaOperativa(
  macroarea: MacroareaCaso | null | undefined,
  fallback?: string | null
) {
  return macroarea ? MACROAREA_LABELS[macroarea] : textoONull(fallback) ?? "-";
}

export function normalizarResponsableHumano(
  responsableActual: string | null | undefined
) {
  const responsable = textoONull(responsableActual);
  if (!responsable) return null;

  if (VALORES_NO_HUMANOS.has(claveSemantica(responsable))) {
    return null;
  }

  return responsable;
}

export function inicialesResponsableOperativo(nombre: string | null | undefined) {
  const texto = textoONull(nombre);
  if (!texto || texto === "Sin asignar") return "SA";
  if (texto === AGENTE_OPERATIVO_ACTIVO) return "IA";

  const partes = texto.split(" ").filter(Boolean);
  const iniciales = partes
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");

  return iniciales || "SA";
}

export function derivarResponsabilidadOperativa(args: {
  macroareaActual?: MacroareaCaso | null;
  macroareaLabel?: string | null;
  responsableActual?: string | null;
  responsableHumanoId?: string | null;
  responsableHumanoNombre?: string | null;
  responsableHumanoAsignadoPor?: string | null;
  responsableHumanoAsignadoAt?: string | null;
}): ResponsabilidadOperativaCaso {
  const responsableHumano =
    textoONull(args.responsableHumanoNombre) ??
    normalizarResponsableHumano(args.responsableActual);
  const enrutamientoAgenteIA = resolverEnrutamientoAgenteIA(
    args.macroareaActual ?? null
  );

  return {
    macroarea_actual: args.macroareaActual ?? null,
    macroarea_label: labelMacroareaOperativa(args.macroareaActual, args.macroareaLabel),
    responsable_actual_raw: textoONull(args.responsableActual),
    responsable_humano_id: textoONull(args.responsableHumanoId),
    responsable_humano: responsableHumano,
    responsable_humano_label: responsableHumano ?? "Sin asignar",
    responsable_humano_asignado_por: textoONull(args.responsableHumanoAsignadoPor),
    responsable_humano_asignado_at: textoONull(args.responsableHumanoAsignadoAt),
    agente_ia_activo: enrutamientoAgenteIA.activo,
    agente_operativo_activo: enrutamientoAgenteIA.activo.nombre,
  };
}
