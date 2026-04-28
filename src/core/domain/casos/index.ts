export { normalizarCaso } from "./normalizarCaso";
export type { CasoInput, CasoNormalizado } from "./contracts";
export type { EstadoCasoNormalizado } from "./types";
export {
  derivarWorkflowDelCaso,
  type AlineacionWorkflow,
  type CierreTecnicoWorkflow,
  type ContinuidadOperativa,
  type EtapaCaso,
  type EtapaEstado,
  type HitoWorkflow,
  type LogisticaEntregaWorkflow,
  type PostventaWorkflow,
  type TransitionResult,
  type WorkflowDelCaso,
  type WorkflowTransition,
  type WorkflowTransitionKey,
  type WorkflowTransitionRule,
  type PersistedWorkflowTransition,
  type PersistedWorkflowTransitionCode,
  type PersistedWorkflowTransitionStatus,
} from "./workflow";
export {
  calcularEstadoSlaDesdeWorkflow,
  derivarRiesgoDesdeWorkflow,
  recomendarAccionDesdeWorkflow,
} from "./workflow-operativa";
