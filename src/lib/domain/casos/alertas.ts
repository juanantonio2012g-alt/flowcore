export type DimensionAlertaTaxonomica =
  | "operativa"
  | "relacional"
  | "estructural"
  | "sistema";

export type OrigenCausalAlerta =
  | "interno"
  | "cliente"
  | "mixto"
  | "indeterminado";

export type PropositoAlertaTaxonomica =
  | "monitoreo_flujo"
  | "proteccion_gestion"
  | "calidad_vinculo"
  | "integridad_expediente";

export type AlertaTaxonomica = {
  dimension: DimensionAlertaTaxonomica;
  origen_causal: OrigenCausalAlerta;
  proposito: PropositoAlertaTaxonomica;
};

export function labelDimensionAlerta(
  dimension: DimensionAlertaTaxonomica
) {
  switch (dimension) {
    case "operativa":
      return "Operativa";
    case "relacional":
      return "Relacional";
    case "estructural":
      return "Estructural";
    case "sistema":
      return "Sistema";
  }
}

export function labelOrigenCausal(origen: OrigenCausalAlerta) {
  switch (origen) {
    case "interno":
      return "Origen interno";
    case "cliente":
      return "Origen cliente";
    case "mixto":
      return "Origen mixto";
    case "indeterminado":
      return "Origen indeterminado";
  }
}

export function labelPropositoAlerta(
  proposito: PropositoAlertaTaxonomica
) {
  switch (proposito) {
    case "monitoreo_flujo":
      return "Monitoreo de flujo";
    case "proteccion_gestion":
      return "Protección de gestión";
    case "calidad_vinculo":
      return "Calidad del vínculo";
    case "integridad_expediente":
      return "Integridad de expediente";
  }
}

export function resumirTaxonomiaAlerta(
  taxonomia: AlertaTaxonomica | null | undefined
) {
  if (!taxonomia) return null;

  return [
    labelDimensionAlerta(taxonomia.dimension),
    labelOrigenCausal(taxonomia.origen_causal),
    labelPropositoAlerta(taxonomia.proposito),
  ].join(" · ");
}
