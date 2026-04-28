import type { MacroareaCaso } from "@/lib/domain/casos";

export type PersonaOperativa = {
  id: string;
  nombre: string;
  macroarea_base: MacroareaCaso;
  synthetic: true;
  active: boolean;
};

/**
 * Catálogo mínimo de personas sintéticas para OpenCore.
 * MVP: datos controlados en código para probar autoasignación, flujo y trazabilidad.
 * Deben reemplazarse por una fuente real cuando exista directorio formal de usuarios.
 */
export const CATALOGO_PERSONAS: PersonaOperativa[] = [
  // OPERACIONES
  {
    id: "11111111-1111-4111-8111-111111111111",
    nombre: "Ana Torres",
    macroarea_base: "operaciones",
    synthetic: true,
    active: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    nombre: "Luis Méndez",
    macroarea_base: "operaciones",
    synthetic: true,
    active: true,
  },

  // TÉCNICO
  {
    id: "33333333-3333-4333-8333-333333333333",
    nombre: "José Ramírez",
    macroarea_base: "tecnico",
    synthetic: true,
    active: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    nombre: "Carla Núñez",
    macroarea_base: "tecnico",
    synthetic: true,
    active: true,
  },

  // COMERCIAL
  {
    id: "55555555-5555-4555-8555-555555555555",
    nombre: "María Gómez",
    macroarea_base: "comercial",
    synthetic: true,
    active: true,
  },
  {
    id: "66666666-6666-4666-8666-666666666666",
    nombre: "Daniel Cruz",
    macroarea_base: "comercial",
    synthetic: true,
    active: true,
  },

  // ADMINISTRACIÓN
  {
    id: "77777777-7777-4777-8777-777777777777",
    nombre: "Sofía Herrera",
    macroarea_base: "administracion",
    synthetic: true,
    active: true,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    nombre: "Pablo Reyes",
    macroarea_base: "administracion",
    synthetic: true,
    active: true,
  },
];

export function obtenerCatalogoPersonasSinteticas(): PersonaOperativa[] {
  return [...CATALOGO_PERSONAS];
}

export function obtenerPersonasActivas(): PersonaOperativa[] {
  return CATALOGO_PERSONAS.filter((persona) => persona.active);
}

export function obtenerPersonasParaMacroarea(
  macroarea: MacroareaCaso | null | undefined
): PersonaOperativa[] {
  if (!macroarea) return [];
  return obtenerPersonasActivas().filter(
    (persona) => persona.macroarea_base === macroarea
  );
}

export function obtenerPersonaPredeterminadaParaMacroarea(
  macroarea: MacroareaCaso | null | undefined
): PersonaOperativa | null {
  return obtenerPersonasParaMacroarea(macroarea)[0] ?? null;
}

export function obtenerPersonaPorId(id: string): PersonaOperativa | null {
  return CATALOGO_PERSONAS.find((p) => p.id === id) ?? null;
}

export function validarPersonaParaMacroarea(
  persona: PersonaOperativa | null,
  macroarea: MacroareaCaso | null | undefined
): boolean {
  if (!persona || !macroarea) return false;
  return persona.active && persona.macroarea_base === macroarea;
}
