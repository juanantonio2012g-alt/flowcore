import { describe, expect, it } from "vitest";
import {
  AGENTE_IA_NOMBRE,
  obtenerAgenteIAActivoPorMacroarea,
  obtenerAgenteIAOrquestador,
  obtenerCatalogoAgentesIA,
  resolverEnrutamientoAgenteIA,
} from "./catalogo-agentes-ia";

describe("catalogo de agentes IA operativos", () => {
  it("expone un catalogo activo y sintetico por macroarea", () => {
    const agentes = obtenerCatalogoAgentesIA();

    expect(agentes).toHaveLength(5);
    expect(
      agentes.every(
        (agente) =>
          agente.nombre === AGENTE_IA_NOMBRE &&
          agente.synthetic === true &&
          agente.active === true &&
          agente.tipo_registro === "system_agent"
      )
    ).toBe(true);
  });

  it("resuelve el agente IA activo segun la macroarea actual", () => {
    expect(obtenerAgenteIAActivoPorMacroarea("operaciones").codigo).toBe(
      "ia-agent-operaciones"
    );
    expect(obtenerAgenteIAActivoPorMacroarea("tecnico").codigo).toBe(
      "ia-agent-tecnico"
    );
    expect(obtenerAgenteIAActivoPorMacroarea("comercial").codigo).toBe(
      "ia-agent-comercial"
    );
    expect(obtenerAgenteIAActivoPorMacroarea("administracion").codigo).toBe(
      "ia-agent-administracion"
    );
  });

  it("mantiene un orquestador general separado del agente IA activo", () => {
    const enrutamiento = resolverEnrutamientoAgenteIA("tecnico");

    expect(obtenerAgenteIAOrquestador().codigo).toBe("ia-agent-general");
    expect(enrutamiento.orquestador.codigo).toBe("ia-agent-general");
    expect(enrutamiento.activo.codigo).toBe("ia-agent-tecnico");
  });
});
