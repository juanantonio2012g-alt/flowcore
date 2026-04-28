import { afterEach, describe, expect, it } from "vitest";
import {
  CATALOGO_PERSONAS,
  obtenerCatalogoPersonasSinteticas,
  obtenerPersonaPredeterminadaParaMacroarea,
  obtenerPersonasParaMacroarea,
} from "./catalogo-personas";
import { validarAsignacionPersona } from "./validar-asignacion";

describe("catalogo-personas", () => {
  afterEach(() => {
    for (const persona of CATALOGO_PERSONAS) {
      persona.active = true;
    }
  });

  it("marca todo el catálogo actual como sintético y activo", () => {
    const personas = obtenerCatalogoPersonasSinteticas();

    expect(personas).toHaveLength(8);
    expect(
      personas.every(
        (persona) =>
          typeof persona.id === "string" &&
          typeof persona.nombre === "string" &&
          typeof persona.macroarea_base === "string" &&
          persona.synthetic === true &&
          persona.active === true
      )
    ).toBe(true);
  });

  it("expone solo personas activas para autoasignación por macroárea", () => {
    const personaPorDefecto = CATALOGO_PERSONAS.find(
      (persona) => persona.id === "33333333-3333-4333-8333-333333333333"
    );

    if (!personaPorDefecto) {
      throw new Error("Persona sintética de prueba no encontrada");
    }

    personaPorDefecto.active = false;

    const personasTecnicas = obtenerPersonasParaMacroarea("tecnico");
    const personaTecnicaPredeterminada =
      obtenerPersonaPredeterminadaParaMacroarea("tecnico");

    expect(
      personasTecnicas.some((persona) => persona.id === personaPorDefecto.id)
    ).toBe(false);
    expect(personaTecnicaPredeterminada?.id).toBe(
      "44444444-4444-4444-8444-444444444444"
    );
  });

  it("rechaza asignar una persona inactiva aunque exista en el catálogo", () => {
    const persona = CATALOGO_PERSONAS.find(
      (item) => item.id === "55555555-5555-4555-8555-555555555555"
    );

    if (!persona) {
      throw new Error("Persona sintética comercial no encontrada");
    }

    persona.active = false;

    const result = validarAsignacionPersona(
      "55555555-5555-4555-8555-555555555555",
      "comercial"
    );

    expect(result.ok).toBe(false);
    expect(result.motivo).toContain("inactivo");
  });
});
