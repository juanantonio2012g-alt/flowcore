import { describe, expect, it } from "vitest";
import {
  ETAPAS_PROCESO_ACTUAL,
  FLUJO_TRAMOS_PROCESO_ACTUAL,
  TRANSITION_RULES_PROCESO_ACTUAL,
  clasificarAccionProcesoActual,
  labelEtapaProcesoActual,
  obtenerOwnerEtapaProcesoActual,
  obtenerSiguienteMacroareaProcesoActual,
  obtenerTransicionesPrioritariasPorEtapaProcesoActual,
} from "./proceso-actual";

describe("lib/domain/casos/proceso-actual", () => {
  it("expone el catalogo de etapas actual con labels y ownership desacoplados del engine", () => {
    expect(ETAPAS_PROCESO_ACTUAL.find((item) => item.etapa === "informe")).toMatchObject({
      label: "Informe técnico",
      label_corta: "Informe",
      owner_default: "tecnico",
      soportada: true,
    });
    expect(labelEtapaProcesoActual("cerrado")).toBe("Caso cerrado");
    expect(labelEtapaProcesoActual("cotizacion", "larga")).toBe("Cotización");
    expect(obtenerOwnerEtapaProcesoActual("gestion_comercial")).toBe("comercial");
    expect(obtenerSiguienteMacroareaProcesoActual("tecnico")).toBe("comercial");
  });

  it("centraliza tramos, transiciones y clasificacion del proceso actual", () => {
    expect(FLUJO_TRAMOS_PROCESO_ACTUAL.find((tramo) => tramo.key === "seguimiento")).toMatchObject({
      label: "Seguimiento",
      etapas: ["gestion_comercial"],
      responsable: "comercial",
    });
    expect(
      TRANSITION_RULES_PROCESO_ACTUAL.find(
        (rule) => rule.key === "gestion_comercial_a_logistica"
      )?.destino
    ).toBe("logistica_entrega");
    expect(clasificarAccionProcesoActual("Registrar seguimiento postventa")).toBe(
      "postventa"
    );
    expect(
      obtenerTransicionesPrioritariasPorEtapaProcesoActual("cotizacion")
    ).toEqual(["cotizacion_a_gestion_comercial", "diagnostico_a_cotizacion"]);
  });
});
