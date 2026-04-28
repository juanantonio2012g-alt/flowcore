export { normalizarCaso } from "./normalizar-caso";
export { normalizarClienteRelacionado } from "./normalizar-cliente";
export { derivarEstadoTecnicoReal } from "./estado-tecnico";
export { derivarEstadoComercialReal } from "./estado-comercial";
export { derivarMacroareaCaso, obtenerMetaMacroarea } from "./macroarea";
export { calcularSenalesMacroarea } from "./senales-macroarea";
export { derivarProximaAccionReal, derivarProximaFechaReal } from "./proxima-accion";
export {
  ETAPAS_PROCESO_ACTUAL,
  FLUJO_TRAMOS_PROCESO_ACTUAL,
  TRANSITION_RULES_PROCESO_ACTUAL,
  clasificarAccionProcesoActual,
  labelEtapaProcesoActual,
  obtenerMetaEtapaProcesoActual,
  obtenerOwnerEtapaProcesoActual,
  obtenerSiguienteMacroareaProcesoActual,
  obtenerTransicionesPrioritariasPorEtapaProcesoActual,
} from "./proceso-actual";
export { derivarRiesgoCaso } from "./riesgo";
export { calcularEstadoSla } from "./sla";
export { recomendarAccionOperativa } from "./recomendacion";
export {
  labelDimensionAlerta,
  labelOrigenCausal,
  labelPropositoAlerta,
  resumirTaxonomiaAlerta,
} from "./alertas";
export type {
  CasoBaseDominio,
  CasoDerivadosDominio,
  CasoNormalizado,
  MacroareaCaso,
  PostventaEstado,
  RiesgoCaso,
} from "./types";
export type {
  EtapaProcesoActual,
  EtapaVisibleProcesoActual,
  FlujoTramoProcesoActual,
  FlujoTramoProcesoActualKey,
  WorkflowTransitionKeyProcesoActual,
  WorkflowTransitionRuleProcesoActual,
} from "./proceso-actual";
export type {
  AlertaTaxonomica,
  DimensionAlertaTaxonomica,
  OrigenCausalAlerta,
  PropositoAlertaTaxonomica,
} from "./alertas";
export type {
  CasoMacroareaSignalInput,
  SenalesMacroarea,
  SenalDelegacion,
} from "./senales-macroarea";
