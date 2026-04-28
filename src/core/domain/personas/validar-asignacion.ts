import type { MacroareaCaso } from "@/lib/domain/casos";
import { validarPersonaParaMacroarea, obtenerPersonaPorId } from "./catalogo-personas";

export type ResultadoAsignacion = {
  ok: boolean;
  personaId: string | null;
  personaNombre: string | null;
  motivo?: string;
  requiereLimpiezaConPrecaucion?: boolean;
};

/**
 * Valida si una persona puede ser asignada a una macroárea específica.
 */
export function validarAsignacionPersona(
  personaId: string | null,
  macroarea: MacroareaCaso | null
): ResultadoAsignacion {
  // Caso: desasignación explícita
  if (!personaId) {
    return {
      ok: true,
      personaId: null,
      personaNombre: null,
      motivo: "Desasignación",
    };
  }

  // Buscar persona
  const persona = obtenerPersonaPorId(personaId);
  if (!persona) {
    return {
      ok: false,
      personaId,
      personaNombre: null,
      motivo: `Persona con ID '${personaId}' no existe en catálogo`,
    };
  }

  if (!persona.active) {
    return {
      ok: false,
      personaId,
      personaNombre: persona.nombre,
      motivo: `${persona.nombre} está inactivo en el catálogo operativo sintético`,
    };
  }

  // Validar macroárea
  if (!macroarea) {
    return {
      ok: false,
      personaId,
      personaNombre: persona.nombre,
      motivo: "No se puede asignar persona sin macroárea definida",
    };
  }

  // Validar coherencia
  const esValida = validarPersonaParaMacroarea(persona, macroarea);
  if (!esValida) {
    return {
      ok: false,
      personaId,
      personaNombre: persona.nombre,
      motivo: `${persona.nombre} pertenece a ${persona.macroarea_base}, no puede asignarse a ${macroarea}`,
    };
  }

  return {
    ok: true,
    personaId,
    personaNombre: persona.nombre,
  };
}

/**
 * Detecta si un cambio de macroárea invalida la asignación actual.
 * Si retorna true, debe limpiarse el responsable humano.
 */
export function detectarInvalidacionPorCambioMacroarea(
  responsableActualId: string | null,
  macroareaAnterior: MacroareaCaso | null,
  macroareaNueva: MacroareaCaso | null
): boolean {
  // Si no hay responsable asignado, no hay invalidación
  if (!responsableActualId) return false;

  // Si no hay cambio real de macroárea, no hay invalidación
  if (macroareaAnterior === macroareaNueva) return false;

  // Obtener persona
  const persona = obtenerPersonaPorId(responsableActualId);
  if (!persona) return true; // Persona no existe, hay que limpiar

  // Validar si es coherente con la NUEVA macroárea
  return !validarPersonaParaMacroarea(persona, macroareaNueva);
}
