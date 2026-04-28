import {
  ETAPAS_PROCESO_ACTUAL,
  TRANSITION_RULES_PROCESO_ACTUAL,
  clasificarAccionProcesoActual,
  obtenerOwnerEtapaProcesoActual,
  obtenerTransicionesPrioritariasPorEtapaProcesoActual,
  type EtapaProcesoActual,
  type WorkflowTransitionKeyProcesoActual,
} from "@/lib/domain/casos/proceso-actual";
import type {
  AuditoriaEstado,
  PostventaEstado,
} from "@/lib/domain/casos/types";
import { parseFechaIsoLocal as parseFechaIsoLocalDesdeLib } from "@/lib/fecha";

export type EtapaCaso = EtapaProcesoActual;

export type EstadoWorkflow = "activo" | "pausado" | "cerrado" | "cancelado";

export type EtapaEstado = {
  etapa: EtapaCaso;
  label: string;
  estado: "completada" | "actual" | "pendiente" | "bloqueada";
  soportada: boolean;
  fecha_referencia: string | null;
  motivo: string;
};

export type HitoWorkflowCodigo =
  | "solicitud_registrada"
  | "informacion_minima_completa"
  | "levantamiento_realizado"
  | "informe_registrado"
  | "diagnostico_registrado"
  | "diagnostico_validado"
  | "diagnostico_observado"
  | "diagnostico_rechazado"
  | "cotizacion_emitida"
  | "seguimiento_registrado"
  | "cliente_aprobo"
  | "cliente_rechazo"
  | "entrega_programada"
  | "entrega_en_ejecucion"
  | "entrega_realizada"
  | "auditoria_iniciada"
  | "auditoria_conforme"
  | "auditoria_con_observaciones"
  | "auditoria_requiere_correccion"
  | "postventa_activada"
  | "postventa_requiere_accion"
  | "postventa_resuelta"
  | "cierre_tecnico_habilitado"
  | "cierre_tecnico_realizado";

export type PersistedWorkflowTransitionCode =
  | "diagnostico_validado"
  | "cotizacion_emitida"
  | "cliente_aprobo"
  | "cliente_rechazo"
  | "cierre_sin_conversion"
  | "postventa_abierta"
  | "cierre_tecnico_habilitado"
  | "cierre_tecnico_registrado";

export type PersistedWorkflowTransitionStatus =
  | "resuelta"
  | "bloqueada"
  | "habilitada";

export type PersistedWorkflowTransition = {
  id: string;
  transition_code: PersistedWorkflowTransitionCode;
  from_stage: EtapaCaso | null;
  to_stage: EtapaCaso | null;
  status: PersistedWorkflowTransitionStatus;
  actor: string | null;
  origin: string;
  occurred_at: string;
  observacion: string | null;
  evidencia_ref: string | null;
};

export type HitoWorkflow = {
  codigo: HitoWorkflowCodigo;
  label: string;
  ocurrio: boolean;
  fecha: string | null;
  actor: string | null;
  origen:
    | "caso"
    | "informe"
    | "diagnostico"
    | "cotizacion"
    | "seguimiento"
    | "logistica"
    | "postventa"
    | "cierre_tecnico"
    | "workflow";
  observacion: string | null;
};

export type LogisticaEntregaWorkflow = {
  fecha_programada: string | null;
  responsable: string | null;
  estado_logistico:
    | "pendiente"
    | "programado"
    | "en_ejecucion"
    | "entregado"
    | "incidencia"
    | null;
  observacion_logistica: string | null;
  confirmacion_entrega: boolean;
  fecha_entrega: string | null;
  created_at: string | null;
};

export type AuditoriaWorkflow = {
  estado_auditoria: AuditoriaEstado;
  fecha_auditoria: string | null;
  responsable_auditoria: string | null;
  observaciones_auditoria: string | null;
  conformidad_cliente: boolean | null;
  requiere_correccion: boolean;
  fecha_cierre_tecnico: string | null;
};

export type PostventaWorkflow = {
  estado_postventa: PostventaEstado;
  fecha_postventa: string | null;
  responsable_postventa: string | null;
  observacion_postventa: string | null;
  requiere_accion: boolean;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  conformidad_final: boolean | null;
  notas: string | null;
};

export type CierreTecnicoWorkflow = {
  fecha_cierre_tecnico: string | null;
  responsable_cierre: string | null;
  motivo_cierre: string | null;
  observacion_cierre: string | null;
  postventa_resuelta: boolean;
  requiere_postventa_adicional: boolean;
  created_at: string | null;
};

export type ContinuidadOperativa = {
  estado: "al_dia" | "pendiente" | "vencida" | "en_espera" | "bloqueada" | "cerrada";
  proxima_accion: string | null;
  proxima_fecha: string | null;
  owner_actual:
    | "operaciones"
    | "tecnico"
    | "comercial"
    | "administracion"
    | null;
  motivo_espera: string | null;
  origen: "manual" | "derivado" | "workflow";
};

export type AlineacionWorkflow = {
  expediente_vs_workflow: "alineado" | "adelantado" | "atrasado";
  continuidad_vs_workflow: "alineada" | "desfasada" | "vencida";
  sla_vs_workflow: "coherente" | "inconsistente";
  alertas: string[];
};

export type WorkflowDelCaso = {
  caso_id: string;
  version: number;
  etapa_actual: EtapaCaso;
  estado_workflow: EstadoWorkflow;
  etapas: EtapaEstado[];
  hitos: HitoWorkflow[];
  logistica: LogisticaEntregaWorkflow | null;
  auditoria: AuditoriaWorkflow | null;
  postventa: PostventaWorkflow | null;
  cierre_tecnico: CierreTecnicoWorkflow | null;
  continuidad: ContinuidadOperativa;
  alineacion: AlineacionWorkflow;
  transiciones: TransitionResult;
  cierre?: {
    resultado_final:
      | "aprobado"
      | "rechazado"
      | "entregado"
      | "cerrado_sin_conversion"
      | "postventa_activa"
      | "cierre_tecnico_realizado";
    fecha_cierre: string | null;
    motivo_cierre: string | null;
  };
  metadata: {
    created_at: string | null;
    updated_at: string | null;
    ultima_transicion_at: string | null;
    ultima_transicion_por: string | null;
    derivado_desde: Array<
      | "casos"
      | "informes_tecnicos"
      | "diagnosticos"
      | "cotizaciones"
      | "seguimientos"
      | "logisticas_entrega"
      | "postventas"
      | "cierres_tecnicos"
      | "workflow_transitions"
    >;
  };
};

export type WorkflowTransitionKey = WorkflowTransitionKeyProcesoActual;

export type WorkflowTransitionRule = {
  key: WorkflowTransitionKey;
  label: string;
  origen: EtapaCaso[];
  destino: EtapaCaso;
  descripcion: string;
};

export type WorkflowTransition = WorkflowTransitionRule & {
  estado: "no_aplica" | "bloqueada" | "habilitada" | "resuelta";
  efectiva: boolean;
  condicion: string;
  resultado: string;
  bloqueos: string[];
  habilitadores: string[];
  observacion: string | null;
  fecha_referencia: string | null;
};

export type TransitionResult = {
  actual: WorkflowTransition | null;
  lista: WorkflowTransition[];
  bloqueos_activos: string[];
  habilitadores_activos: string[];
  resumen: {
    estado: "fluido" | "condicionado" | "bloqueado";
    descripcion: string;
  };
};

export type DerivarWorkflowDelCasoInput = {
  caso_id: string;
  created_at?: string | null;
  estado_tecnico_real: string;
  estado_comercial_real: string;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  sla_nivel: "rojo" | "amarillo" | "verde";
  requiere_validacion: boolean;
  validacion_pendiente?: boolean;
  validacion_resuelta?: boolean;
  resultado_validacion?: string | null;
  validado_por?: string | null;
  fecha_validacion?: string | null;
  tiene_informe?: boolean;
  informe_created_at?: string | null;
  tiene_diagnostico?: boolean;
  diagnostico_created_at?: string | null;
  tiene_cotizacion?: boolean;
  cotizacion_created_at?: string | null;
  tiene_seguimiento?: boolean;
  seguimiento_created_at?: string | null;
  seguimiento_estado_comercial?: string | null;
  seguimiento_proximo_paso?: string | null;
  seguimiento_proxima_fecha?: string | null;
  responsable_actual?: string | null;
  tiene_logistica?: boolean;
  logistica_created_at?: string | null;
  logistica_fecha_programada?: string | null;
  logistica_responsable?: string | null;
  logistica_estado?: string | null;
  logistica_observacion?: string | null;
  logistica_confirmacion_entrega?: boolean | null;
  logistica_fecha_entrega?: string | null;
  tiene_auditoria?: boolean;
  auditoria_created_at?: string | null;
  auditoria_estado?: AuditoriaWorkflow["estado_auditoria"] | null;
  auditoria_fecha_auditoria?: string | null;
  auditoria_responsable?: string | null;
  auditoria_observaciones?: string | null;
  auditoria_conformidad_cliente?: boolean | null;
  auditoria_requiere_correccion?: boolean | null;
  auditoria_fecha_cierre_tecnico?: string | null;
  tiene_postventa?: boolean;
  postventa_created_at?: string | null;
  postventa_fecha?: string | null;
  postventa_estado?: PostventaWorkflow["estado_postventa"] | null;
  postventa_responsable?: string | null;
  postventa_observacion?: string | null;
  postventa_requiere_accion?: boolean | null;
  postventa_proxima_accion?: string | null;
  postventa_proxima_fecha?: string | null;
  postventa_conformidad_final?: boolean | null;
  postventa_notas?: string | null;
  tiene_cierre_tecnico?: boolean;
  cierre_tecnico_created_at?: string | null;
  cierre_tecnico_fecha?: string | null;
  cierre_tecnico_responsable?: string | null;
  cierre_tecnico_motivo?: string | null;
  cierre_tecnico_observacion?: string | null;
  cierre_tecnico_postventa_resuelta?: boolean | null;
  cierre_tecnico_requiere_postventa_adicional?: boolean | null;
  workflow_transitions?: PersistedWorkflowTransition[];
};

const ETAPAS_WORKFLOW = ETAPAS_PROCESO_ACTUAL;

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sortPersistedTransitions(
  transitions: PersistedWorkflowTransition[] | null | undefined
) {
  return [...(transitions ?? [])].sort((a, b) => {
    const dateA = parseDateSafe(a.occurred_at)?.getTime() ?? 0;
    const dateB = parseDateSafe(b.occurred_at)?.getTime() ?? 0;
    return dateB - dateA;
  });
}

function getPersistedTransitions(
  input: DerivarWorkflowDelCasoInput
): PersistedWorkflowTransition[] {
  return sortPersistedTransitions(input.workflow_transitions);
}

function getPersistedTransitionByCode(
  input: DerivarWorkflowDelCasoInput,
  code: PersistedWorkflowTransitionCode,
  statuses: PersistedWorkflowTransitionStatus[] = ["resuelta"]
) {
  return getPersistedTransitions(input).find(
    (transition) =>
      transition.transition_code === code && statuses.includes(transition.status)
  ) ?? null;
}

function clasificarAccionPorEtapa(
  accion: string | null | undefined
): EtapaCaso | null {
  return clasificarAccionProcesoActual(accion);
}

function esContinuidadNeutralInicial(accion: string | null | undefined) {
  return normalizarTexto(accion) === "definir proxima accion y fecha";
}

function deriveEtapaActual(input: DerivarWorkflowDelCasoInput): EtapaCaso {
  const estadoComercial = normalizarTexto(input.estado_comercial_real);
  const accionEtapa = clasificarAccionPorEtapa(input.proxima_accion);
  const cierreSinConversion = getPersistedTransitionByCode(
    input,
    "cierre_sin_conversion"
  );
  const clienteAprobo = getPersistedTransitionByCode(input, "cliente_aprobo");
  const postventaAbierta = getPersistedTransitionByCode(input, "postventa_abierta");
  const cierreTecnicoHabilitado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_habilitado",
    ["resuelta", "habilitada"]
  );
  const cierreTecnicoRegistrado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_registrado"
  );
  const cotizacionEmitida = getPersistedTransitionByCode(
    input,
    "cotizacion_emitida"
  );
  const entregaRealizada =
    input.logistica_confirmacion_entrega === true ||
    normalizarTexto(input.logistica_estado) === "entregado" ||
    !!input.logistica_fecha_entrega;

  if (cierreSinConversion) return "cerrado";
  if (input.tiene_cierre_tecnico || cierreTecnicoRegistrado) {
    return "cierre_tecnico";
  }
  if (input.tiene_postventa || postventaAbierta || cierreTecnicoHabilitado) {
    return "postventa";
  }
  if (entregaRealizada) return "auditoria";
  if (clienteAprobo) return "logistica_entrega";
  if (estadoComercial === "rechazado") return "cerrado";
  if (estadoComercial === "aprobado") return "logistica_entrega";
  if (input.tiene_logistica) return "logistica_entrega";

  if (
    input.tiene_seguimiento ||
    [
      "en_proceso",
      "negociacion",
      "esperando_cliente",
      "pausado",
    ].includes(estadoComercial)
  ) {
    return "gestion_comercial";
  }

  if (input.tiene_cotizacion || cotizacionEmitida) {
    return "cotizacion";
  }

  if (
    input.tiene_diagnostico ||
    input.requiere_validacion ||
    input.validacion_pendiente
  ) {
    return "diagnostico";
  }

  if (accionEtapa === "cotizacion") {
    return "cotizacion";
  }

  if (input.tiene_informe || accionEtapa === "informe") {
    return "informe";
  }

  if (accionEtapa === "levantamiento") {
    return "levantamiento";
  }

  if (accionEtapa === "recoleccion") {
    return "recoleccion";
  }

  return "solicitud";
}

function deriveEstadoWorkflow(input: DerivarWorkflowDelCasoInput, etapa: EtapaCaso) {
  const estadoComercial = normalizarTexto(input.estado_comercial_real);

  if (etapa === "cerrado" || etapa === "cierre_tecnico") return "cerrado" as const;
  if (estadoComercial === "pausado") return "pausado" as const;
  return "activo" as const;
}

function parseDateSafe(valor: string | null | undefined) {
  return parseFechaIsoLocalDesdeLib(valor);
}

function resolveUpdatedAt(input: DerivarWorkflowDelCasoInput) {
  const fechas = [
    input.created_at,
    input.informe_created_at,
    input.diagnostico_created_at,
    input.fecha_validacion,
    input.cotizacion_created_at,
    input.seguimiento_created_at,
    input.logistica_created_at,
    input.logistica_fecha_programada,
    input.logistica_fecha_entrega,
    input.auditoria_created_at ?? null,
    input.auditoria_fecha_auditoria ?? null,
    input.auditoria_fecha_cierre_tecnico ?? null,
    input.postventa_created_at ?? null,
    input.postventa_fecha ?? null,
    input.postventa_proxima_fecha ?? null,
    input.cierre_tecnico_created_at ?? null,
    input.cierre_tecnico_fecha ?? null,
    getPersistedTransitions(input)[0]?.occurred_at ?? null,
  ]
    .map((valor) => parseDateSafe(valor))
    .filter((valor): valor is Date => !!valor)
    .sort((a, b) => b.getTime() - a.getTime());

  return fechas[0]?.toISOString() ?? input.created_at ?? null;
}

function deriveUltimaTransicionAt(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso
) {
  const workflowTransitionAt = getPersistedTransitions(input)[0]?.occurred_at ?? null;

  if (workflowTransitionAt) {
    return workflowTransitionAt;
  }

  if (etapaActual === "auditoria") {
    return input.auditoria_created_at ?? input.auditoria_fecha_auditoria ?? null;
  }

  if (etapaActual === "postventa") {
    return (
      input.postventa_created_at ??
      input.postventa_fecha ??
      input.postventa_proxima_fecha ??
      input.auditoria_created_at ??
      input.auditoria_fecha_auditoria ??
      null
    );
  }

  if (etapaActual === "cierre_tecnico") {
    return (
      input.cierre_tecnico_created_at ??
      input.cierre_tecnico_fecha ??
      input.postventa_created_at ??
      input.postventa_fecha ??
      null
    );
  }

  switch (etapaActual) {
    case "logistica_entrega":
      return (
        input.logistica_fecha_entrega ??
        input.logistica_fecha_programada ??
        input.logistica_created_at ??
        input.seguimiento_created_at ??
        input.cotizacion_created_at ??
        input.created_at ??
        null
      );
    case "gestion_comercial":
      return input.seguimiento_created_at ?? input.cotizacion_created_at ?? null;
    case "cotizacion":
      return input.cotizacion_created_at ?? null;
    case "diagnostico":
      return input.fecha_validacion ?? input.diagnostico_created_at ?? null;
    case "informe":
      return input.informe_created_at ?? null;
    default:
      return input.created_at ?? null;
  }
}

function deriveUltimaTransicionPor(input: DerivarWorkflowDelCasoInput) {
  const workflowTransitionActor = getPersistedTransitions(input)[0]?.actor ?? null;

  if (workflowTransitionActor) {
    return workflowTransitionActor;
  }

  if (input.fecha_validacion && input.validado_por) {
    return input.validado_por;
  }

  if (input.auditoria_fecha_auditoria && input.auditoria_responsable) {
    return input.auditoria_responsable;
  }

  if (input.postventa_fecha && input.postventa_responsable) {
    return input.postventa_responsable;
  }

  if (input.cierre_tecnico_fecha && input.cierre_tecnico_responsable) {
    return input.cierre_tecnico_responsable;
  }

  return null;
}

function deriveContinuidadOwner(input: DerivarWorkflowDelCasoInput, etapaActual: EtapaCaso) {
  const responsable = normalizarTexto(
    input.cierre_tecnico_responsable ??
      input.postventa_responsable ??
      input.logistica_responsable ??
      input.responsable_actual
  );

  if (responsable.includes("tecnico")) return "tecnico" as const;
  if (responsable.includes("comercial")) return "comercial" as const;
  if (responsable.includes("admin")) return "administracion" as const;
  if (responsable.includes("oper")) return "operaciones" as const;

  return obtenerOwnerEtapaProcesoActual(etapaActual);
}

function deriveLogistica(
  input: DerivarWorkflowDelCasoInput
): LogisticaEntregaWorkflow | null {
  if (!input.tiene_logistica) return null;

  const estado = normalizarTexto(input.logistica_estado);
  const estadoLogistico =
    estado === "pendiente" ||
    estado === "programado" ||
    estado === "en_ejecucion" ||
    estado === "entregado" ||
    estado === "incidencia"
      ? estado
      : null;

  return {
    fecha_programada: input.logistica_fecha_programada ?? null,
    responsable: input.logistica_responsable ?? null,
    estado_logistico: estadoLogistico,
    observacion_logistica: input.logistica_observacion ?? null,
    confirmacion_entrega: input.logistica_confirmacion_entrega === true,
    fecha_entrega: input.logistica_fecha_entrega ?? null,
    created_at: input.logistica_created_at ?? null,
  };
}

function sumarDiasIso(fecha: string): string | null {
  const fechaBase = parseDateSafe(fecha);
  if (!fechaBase) return null;
  fechaBase.setDate(fechaBase.getDate() + 1);
  const year = fechaBase.getFullYear();
  const month = String(fechaBase.getMonth() + 1).padStart(2, "0");
  const day = String(fechaBase.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function deriveAuditoria(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso
): AuditoriaWorkflow | null {
  if (
    etapaActual !== "auditoria" &&
    etapaActual !== "postventa" &&
    etapaActual !== "cierre_tecnico"
  ) {
    return null;
  }

  return {
    estado_auditoria: input.auditoria_estado ?? "pendiente",
    fecha_auditoria: input.auditoria_fecha_auditoria ?? null,
    responsable_auditoria: input.auditoria_responsable ?? null,
    observaciones_auditoria: input.auditoria_observaciones ?? null,
    conformidad_cliente: input.auditoria_conformidad_cliente ?? null,
    requiere_correccion: input.auditoria_requiere_correccion === true,
    fecha_cierre_tecnico: input.auditoria_fecha_cierre_tecnico ?? null,
  };
}

function derivePostventa(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso
): PostventaWorkflow | null {
  if (etapaActual !== "postventa" && etapaActual !== "cierre_tecnico") return null;

  return {
    estado_postventa: input.postventa_estado ?? "abierta",
    fecha_postventa: input.postventa_fecha ?? null,
    responsable_postventa: input.postventa_responsable ?? null,
    observacion_postventa: input.postventa_observacion ?? null,
    requiere_accion: input.postventa_requiere_accion === true,
    proxima_accion: input.postventa_proxima_accion ?? null,
    proxima_fecha: input.postventa_proxima_fecha ?? null,
    conformidad_final: input.postventa_conformidad_final ?? null,
    notas: input.postventa_notas ?? null,
  };
}

function deriveCierreTecnico(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso
): CierreTecnicoWorkflow | null {
  if (etapaActual !== "cierre_tecnico") return null;

  return {
    fecha_cierre_tecnico: input.cierre_tecnico_fecha ?? null,
    responsable_cierre: input.cierre_tecnico_responsable ?? null,
    motivo_cierre: input.cierre_tecnico_motivo ?? null,
    observacion_cierre: input.cierre_tecnico_observacion ?? null,
    postventa_resuelta: input.cierre_tecnico_postventa_resuelta === true,
    requiere_postventa_adicional:
      input.cierre_tecnico_requiere_postventa_adicional === true,
    created_at: input.cierre_tecnico_created_at ?? null,
  };
}

function deriveContinuidad(input: DerivarWorkflowDelCasoInput, etapaActual: EtapaCaso): ContinuidadOperativa {
  const logistica = deriveLogistica(input);
  const proximaAccionDerivadaLogistica =
    logistica?.estado_logistico === "entregado"
      ? "Confirmar entrega realizada"
      : logistica?.estado_logistico === "en_ejecucion"
        ? "Ejecutar entrega"
        : logistica?.estado_logistico === "incidencia"
          ? "Resolver incidencia logística"
          : logistica?.estado_logistico === "programado"
            ? "Coordinar ejecución o entrega"
            : etapaActual === "logistica_entrega"
              ? "Confirmar programación"
              : null;
  const proximaFechaDerivadaLogistica =
    logistica?.fecha_entrega ?? logistica?.fecha_programada ?? null;
  const proximaAccion =
    input.proxima_accion ?? proximaAccionDerivadaLogistica ?? null;
  const proximaFecha =
    input.proxima_fecha ?? proximaFechaDerivadaLogistica ?? null;
  const estadoComercial = normalizarTexto(input.estado_comercial_real);
  const fecha = parseDateSafe(proximaFecha);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyIso =
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
      hoy.getDate()
    ).padStart(2, "0")}`;

  if (etapaActual === "cierre_tecnico") {
    return {
      estado: "cerrada",
      proxima_accion: null,
      proxima_fecha: null,
      owner_actual: deriveContinuidadOwner(input, etapaActual),
      motivo_espera:
        "El caso completó auditoría y postventa y quedó técnicamente cerrado, sin acciones operativas pendientes.",
      origen: "workflow",
    };
  }

  if (etapaActual === "auditoria") {
    const auditState = normalizarTexto(input.auditoria_estado);
    const accionPersistidaAuditoria = clasificarAccionPorEtapa(input.proxima_accion);
    const fechaAuditoria =
      input.auditoria_fecha_auditoria ||
      input.logistica_fecha_entrega ||
      hoyIso;
    const fechaCierreTecnico =
      input.auditoria_fecha_cierre_tecnico ?? fechaAuditoria;
    const proximaFechaAuditoriaPendiente = sumarDiasIso(fechaAuditoria);

    switch (auditState) {
      case "en_revision":
      case "pendiente":
      case "con_observaciones":
        return {
          estado: "pendiente",
          proxima_accion: "Registrar resultado de auditoría",
          proxima_fecha: proximaFechaAuditoriaPendiente,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La auditoría de cierre técnico está pendiente o en revisión tras la entrega.",
          origen: "workflow",
        };
      case "requiere_correccion":
        return {
          estado: "pendiente",
          proxima_accion: "Gestionar corrección pendiente",
          proxima_fecha: proximaFechaAuditoriaPendiente,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La auditoría identificó correcciones pendientes que deben resolverse antes de cerrar técnicamente.",
          origen: "workflow",
        };
      case "conforme":
        return {
          estado: "al_dia",
          proxima_accion:
            accionPersistidaAuditoria === "postventa"
              ? input.proxima_accion
              : "Registrar seguimiento postventa",
          proxima_fecha: input.proxima_fecha ?? fechaCierreTecnico,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La auditoría confirmó conformidad y el caso debe pasar a postventa antes del cierre técnico.",
          origen: "workflow",
        };
      case "cerrada":
        return {
          estado: "al_dia",
          proxima_accion:
            accionPersistidaAuditoria === "postventa"
              ? input.proxima_accion
              : "Registrar seguimiento postventa",
          proxima_fecha: input.proxima_fecha ?? fechaCierreTecnico,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La auditoría quedó cerrada y el caso debe consolidar postventa antes del cierre técnico.",
          origen: "workflow",
        };
      default:
        return {
          estado: "pendiente",
          proxima_accion: "Registrar resultado de auditoría",
          proxima_fecha: proximaFechaAuditoriaPendiente,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La auditoría de cierre técnico está pendiente tras la entrega.",
          origen: "workflow",
        };
    }
  }

  if (etapaActual === "postventa") {
    const estadoPostventa = normalizarTexto(input.postventa_estado);
    const fechaBasePostventa =
      input.postventa_fecha ??
      input.auditoria_fecha_cierre_tecnico ??
      input.auditoria_fecha_auditoria ??
      hoyIso;
    const proximaAccionPostventa =
      input.postventa_proxima_accion ??
      input.proxima_accion ??
      (estadoPostventa === "requiere_accion"
        ? "Gestionar acción postventa pendiente"
        : "Dar seguimiento postventa");
    const proximaFechaPostventa =
      input.postventa_proxima_fecha ??
      input.proxima_fecha ??
      (estadoPostventa === "resuelta" || estadoPostventa === "cerrada"
        ? fechaBasePostventa
        : sumarDiasIso(fechaBasePostventa));
    const fechaPostventa = parseDateSafe(proximaFechaPostventa);

    if (estadoPostventa === "resuelta" || estadoPostventa === "cerrada") {
      if (
        input.postventa_conformidad_final === true &&
        input.postventa_requiere_accion !== true
      ) {
        return {
          estado: "al_dia",
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: proximaFechaPostventa,
          owner_actual: deriveContinuidadOwner(input, etapaActual),
          motivo_espera:
            "La postventa quedó resuelta sin acciones pendientes y el caso puede avanzar a cierre técnico.",
          origen: "workflow",
        };
      }

      return {
        estado: "pendiente",
        proxima_accion: "Confirmar salida de postventa",
        proxima_fecha: proximaFechaPostventa,
        owner_actual: deriveContinuidadOwner(input, etapaActual),
        motivo_espera:
          "La postventa registra cierre operativo, pero todavía falta confirmar conformidad final o ausencia de acciones remanentes.",
        origen: "workflow",
      };
    }

    if (input.postventa_requiere_accion === true || estadoPostventa === "requiere_accion") {
      return {
        estado:
          fechaPostventa && fechaPostventa.getTime() < hoy.getTime()
            ? "vencida"
            : "pendiente",
        proxima_accion: proximaAccionPostventa,
        proxima_fecha: proximaFechaPostventa,
        owner_actual: deriveContinuidadOwner(input, etapaActual),
        motivo_espera:
          "La postventa mantiene una acción operativa pendiente antes de habilitar el cierre técnico.",
        origen: "workflow",
      };
    }

    if (!proximaAccionPostventa || !proximaFechaPostventa) {
      return {
        estado: "pendiente",
        proxima_accion: "Dar seguimiento postventa",
        proxima_fecha: sumarDiasIso(fechaBasePostventa),
        owner_actual: deriveContinuidadOwner(input, etapaActual),
        motivo_espera:
          "La postventa ya existe, pero todavía necesita una continuidad explícita para avanzar con control.",
        origen: "workflow",
      };
    }

    return {
      estado:
        fechaPostventa && fechaPostventa.getTime() < hoy.getTime()
          ? "vencida"
          : "al_dia",
      proxima_accion: proximaAccionPostventa,
      proxima_fecha: proximaFechaPostventa,
      owner_actual: deriveContinuidadOwner(input, etapaActual),
      motivo_espera:
        "La continuidad actual mantiene activo el tramo de postventa previo al cierre técnico.",
      origen: "workflow",
    };
  }

  let estado: ContinuidadOperativa["estado"] = "al_dia";
  let motivoEspera: string | null = null;

  if (estadoComercial === "pausado") {
    estado = "bloqueada";
    motivoEspera = "El caso quedó pausado y necesita redefinir continuidad.";
  } else if (logistica?.estado_logistico === "incidencia") {
    estado = "bloqueada";
    motivoEspera =
      "La logística registró una incidencia y necesita resolución antes de continuar.";
  } else if (
    estadoComercial === "esperando_cliente" ||
    normalizarTexto(proximaAccion).includes("esperar")
  ) {
    estado = "en_espera";
    motivoEspera = "La continuidad quedó a la espera de respuesta o aprobación externa.";
  } else if (!proximaAccion || !proximaFecha) {
    estado = "pendiente";
    motivoEspera = "Falta completar próxima acción o próxima fecha.";
  } else if (fecha && fecha.getTime() < hoy.getTime()) {
    estado = "vencida";
    motivoEspera = "La próxima acción quedó vencida respecto a la fecha comprometida.";
  }

  const origen: ContinuidadOperativa["origen"] =
    input.seguimiento_proximo_paso || input.seguimiento_proxima_fecha
      ? "manual"
      : proximaAccion || proximaFecha
        ? logistica && !input.proxima_accion && !input.proxima_fecha
          ? "workflow"
          : "manual"
        : "derivado";

  return {
    estado,
    proxima_accion: proximaAccion,
    proxima_fecha: proximaFecha,
    owner_actual: deriveContinuidadOwner(input, etapaActual),
    motivo_espera: motivoEspera,
    origen,
  };
}

function etapaCompletada(etapa: EtapaCaso, input: DerivarWorkflowDelCasoInput, estadoWorkflow: EstadoWorkflow) {
  const estadoComercial = normalizarTexto(input.estado_comercial_real);
  const cotizacionEmitida = getPersistedTransitionByCode(
    input,
    "cotizacion_emitida"
  );
  const clienteAprobo = getPersistedTransitionByCode(input, "cliente_aprobo");
  const cierreSinConversion = getPersistedTransitionByCode(
    input,
    "cierre_sin_conversion"
  );
  const postventaAbierta = getPersistedTransitionByCode(input, "postventa_abierta");
  const cierreTecnicoHabilitado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_habilitado",
    ["resuelta", "habilitada"]
  );
  const cierreTecnicoRegistrado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_registrado"
  );

  switch (etapa) {
    case "solicitud":
      return !!input.created_at;
    case "recoleccion":
      return false;
    case "levantamiento":
      return false;
    case "informe":
      return !!input.tiene_informe;
    case "diagnostico":
      return !!input.tiene_diagnostico;
    case "cotizacion":
      return !!input.tiene_cotizacion || !!cotizacionEmitida;
    case "gestion_comercial":
      return (
        !!input.tiene_seguimiento ||
        estadoComercial === "aprobado" ||
        estadoComercial === "rechazado" ||
        !!clienteAprobo ||
        !!cierreSinConversion
      );
    case "logistica_entrega":
      return !!input.tiene_logistica || !!clienteAprobo;
    case "auditoria":
      return !!input.tiene_auditoria;
    case "postventa":
      return !!input.tiene_postventa || !!postventaAbierta || !!cierreTecnicoHabilitado;
    case "cierre_tecnico":
      return !!input.tiene_cierre_tecnico || !!cierreTecnicoRegistrado;
    case "cerrado":
      return estadoWorkflow === "cerrado";
  }
}

function fechaEtapa(etapa: EtapaCaso, input: DerivarWorkflowDelCasoInput) {
  const diagnosticoValidado = getPersistedTransitionByCode(
    input,
    "diagnostico_validado"
  );
  const cotizacionEmitida = getPersistedTransitionByCode(
    input,
    "cotizacion_emitida"
  );
  const clienteAprobo = getPersistedTransitionByCode(input, "cliente_aprobo");
  const cierreSinConversion = getPersistedTransitionByCode(
    input,
    "cierre_sin_conversion"
  );
  const postventaAbierta = getPersistedTransitionByCode(input, "postventa_abierta");
  const cierreTecnicoHabilitado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_habilitado",
    ["resuelta", "habilitada"]
  );
  const cierreTecnicoRegistrado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_registrado"
  );

  switch (etapa) {
    case "solicitud":
      return input.created_at ?? null;
    case "informe":
      return input.informe_created_at ?? null;
    case "diagnostico":
      return (
        diagnosticoValidado?.occurred_at ??
        input.fecha_validacion ??
        input.diagnostico_created_at ??
        null
      );
    case "cotizacion":
      return cotizacionEmitida?.occurred_at ?? input.cotizacion_created_at ?? null;
    case "gestion_comercial":
      return input.seguimiento_created_at ?? null;
    case "logistica_entrega":
      return (
        input.logistica_fecha_entrega ??
        input.logistica_fecha_programada ??
        input.logistica_created_at ??
        clienteAprobo?.occurred_at ??
        null
      );
    case "auditoria":
      return (
        input.auditoria_fecha_auditoria ??
        input.auditoria_created_at ??
        input.logistica_fecha_entrega ??
        null
      );
    case "postventa":
      return (
        input.postventa_fecha ??
        input.postventa_created_at ??
        postventaAbierta?.occurred_at ??
        cierreTecnicoHabilitado?.occurred_at ??
        null
      );
    case "cierre_tecnico":
      return (
        input.cierre_tecnico_fecha ??
        input.cierre_tecnico_created_at ??
        cierreTecnicoRegistrado?.occurred_at ??
        cierreTecnicoHabilitado?.occurred_at ??
        null
      );
    case "cerrado":
      return cierreSinConversion?.occurred_at ?? input.seguimiento_created_at ?? null;
    default:
      return null;
  }
}

function motivoEtapa(etapa: EtapaCaso, soportada: boolean) {
  if (!soportada) {
    return "La etapa forma parte del blueprint maestro, pero todavía no tiene soporte formal completo en dominio.";
  }

  switch (etapa) {
    case "solicitud":
      return "El caso ya fue registrado y puede iniciar su recorrido formal.";
    case "informe":
      return "La etapa depende de contar con un informe técnico registrado.";
    case "diagnostico":
      return "La etapa depende de contar con un diagnóstico técnico registrado y su validación cuando aplique.";
    case "cotizacion":
      return "La etapa depende de contar con una cotización emitida o lista para emitirse.";
    case "gestion_comercial":
      return "La etapa concentra seguimiento, negociación y resolución comercial.";
    case "logistica_entrega":
      return "La etapa permite operar programación, ejecución e incidencias de entrega sin volver al tramo comercial.";
    case "auditoria":
      return "La etapa consolida la validación posterior a la entrega antes de abrir postventa.";
    case "postventa":
      return "La etapa gobierna seguimiento posterior, conformidad final y remanentes antes del cierre técnico.";
    case "cierre_tecnico":
      return "La etapa formaliza el cierre técnico final y saca al caso del flujo operativo activo.";
    case "cerrado":
      return "La etapa representa el cierre operativo del caso.";
    default:
      return "La etapa se mantiene pendiente dentro del workflow formal del caso.";
  }
}

function deriveEtapas(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso,
  estadoWorkflow: EstadoWorkflow
): EtapaEstado[] {
  const actualIndex = ETAPAS_WORKFLOW.findIndex((item) => item.etapa === etapaActual);

  return ETAPAS_WORKFLOW.map((item, index) => {
    const completada = etapaCompletada(item.etapa, input, estadoWorkflow);
    let estado: EtapaEstado["estado"];

    if (item.etapa === etapaActual) {
      estado = "actual";
    } else if (completada) {
      estado = "completada";
    } else if (index < actualIndex) {
      estado = "bloqueada";
    } else {
      estado = "pendiente";
    }

    return {
      etapa: item.etapa,
      label: item.label,
      estado,
      soportada: item.soportada,
      fecha_referencia: fechaEtapa(item.etapa, input),
      motivo: motivoEtapa(item.etapa, item.soportada),
    };
  });
}

function buildHitos(input: DerivarWorkflowDelCasoInput): HitoWorkflow[] {
  const resultadoValidacion = normalizarTexto(input.resultado_validacion);
  const estadoComercial = normalizarTexto(input.estado_comercial_real);
  const diagnosticoValidado = getPersistedTransitionByCode(
    input,
    "diagnostico_validado"
  );
  const cotizacionEmitida = getPersistedTransitionByCode(
    input,
    "cotizacion_emitida"
  );
  const clienteAprobo = getPersistedTransitionByCode(input, "cliente_aprobo");
  const clienteRechazo = getPersistedTransitionByCode(input, "cliente_rechazo");
  const postventaAbierta = getPersistedTransitionByCode(input, "postventa_abierta");
  const cierreTecnicoHabilitado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_habilitado",
    ["resuelta", "habilitada"]
  );
  const cierreTecnicoRegistrado = getPersistedTransitionByCode(
    input,
    "cierre_tecnico_registrado"
  );

  return [
    {
      codigo: "solicitud_registrada",
      label: "Solicitud registrada",
      ocurrio: !!input.created_at,
      fecha: input.created_at ?? null,
      actor: null,
      origen: "caso",
      observacion: "La creación del caso marca el inicio del workflow.",
    },
    {
      codigo: "informacion_minima_completa",
      label: "Información mínima completa",
      ocurrio: !!input.proxima_accion || !!input.proxima_fecha || !!input.tiene_informe,
      fecha: input.informe_created_at ?? input.created_at ?? null,
      actor: null,
      origen: "workflow",
      observacion:
        "En Fase 1 se infiere desde continuidad inicial o desde la existencia de un informe.",
    },
    {
      codigo: "levantamiento_realizado",
      label: "Levantamiento realizado",
      ocurrio: false,
      fecha: null,
      actor: null,
      origen: "workflow",
      observacion: "Todavía no existe un módulo formal de levantamiento en el dominio actual.",
    },
    {
      codigo: "informe_registrado",
      label: "Informe técnico registrado",
      ocurrio: !!input.tiene_informe,
      fecha: input.informe_created_at ?? null,
      actor: null,
      origen: "informe",
      observacion: null,
    },
    {
      codigo: "diagnostico_registrado",
      label: "Diagnóstico registrado",
      ocurrio: !!input.tiene_diagnostico,
      fecha: input.diagnostico_created_at ?? null,
      actor: null,
      origen: "diagnostico",
      observacion: null,
    },
    {
      codigo: "diagnostico_validado",
      label: "Diagnóstico validado",
      ocurrio: resultadoValidacion === "validado" || !!diagnosticoValidado,
      fecha: diagnosticoValidado?.occurred_at ?? input.fecha_validacion ?? null,
      actor: diagnosticoValidado?.actor ?? input.validado_por ?? null,
      origen: diagnosticoValidado ? "workflow" : "diagnostico",
      observacion: diagnosticoValidado?.observacion ?? null,
    },
    {
      codigo: "diagnostico_observado",
      label: "Diagnóstico observado",
      ocurrio: resultadoValidacion === "observado",
      fecha: input.fecha_validacion ?? null,
      actor: input.validado_por ?? null,
      origen: "diagnostico",
      observacion: "La validación formal mantiene cautela y no resuelve el avance.",
    },
    {
      codigo: "diagnostico_rechazado",
      label: "Diagnóstico rechazado",
      ocurrio: resultadoValidacion === "rechazado",
      fecha: input.fecha_validacion ?? null,
      actor: input.validado_por ?? null,
      origen: "diagnostico",
      observacion: "La validación formal resolvió la revisión, pero no confirmó el criterio técnico.",
    },
    {
      codigo: "cotizacion_emitida",
      label: "Cotización emitida",
      ocurrio: !!input.tiene_cotizacion || !!cotizacionEmitida,
      fecha: cotizacionEmitida?.occurred_at ?? input.cotizacion_created_at ?? null,
      actor: cotizacionEmitida?.actor ?? null,
      origen: cotizacionEmitida ? "workflow" : "cotizacion",
      observacion: cotizacionEmitida?.observacion ?? null,
    },
    {
      codigo: "seguimiento_registrado",
      label: "Seguimiento registrado",
      ocurrio: !!input.tiene_seguimiento,
      fecha: input.seguimiento_created_at ?? null,
      actor: null,
      origen: "seguimiento",
      observacion: "El seguimiento es transversal y no reemplaza por sí solo una etapa estructural.",
    },
    {
      codigo: "cliente_aprobo",
      label: "Cliente aprobó",
      ocurrio: estadoComercial === "aprobado" || !!clienteAprobo,
      fecha:
        clienteAprobo?.occurred_at ??
        input.seguimiento_created_at ??
        input.cotizacion_created_at ??
        null,
      actor: clienteAprobo?.actor ?? null,
      origen: clienteAprobo ? "workflow" : "seguimiento",
      observacion: clienteAprobo?.observacion ?? null,
    },
    {
      codigo: "cliente_rechazo",
      label: "Cliente rechazó",
      ocurrio: estadoComercial === "rechazado" || !!clienteRechazo,
      fecha:
        clienteRechazo?.occurred_at ??
        input.seguimiento_created_at ??
        input.cotizacion_created_at ??
        null,
      actor: clienteRechazo?.actor ?? null,
      origen: clienteRechazo ? "workflow" : "seguimiento",
      observacion: clienteRechazo?.observacion ?? null,
    },
    {
      codigo: "entrega_programada",
      label: "Entrega programada",
      ocurrio:
        !!input.logistica_fecha_programada ||
        ["programado", "en_ejecucion", "entregado", "incidencia"].includes(
          normalizarTexto(input.logistica_estado)
        ),
      fecha: input.logistica_fecha_programada ?? input.logistica_created_at ?? null,
      actor: input.logistica_responsable ?? null,
      origen: "logistica",
      observacion:
        "La etapa logística ya tiene una programación formal para coordinar ejecución o entrega.",
    },
    {
      codigo: "entrega_en_ejecucion",
      label: "Entrega en ejecución",
      ocurrio:
        ["en_ejecucion", "entregado"].includes(
          normalizarTexto(input.logistica_estado)
        ),
      fecha:
        normalizarTexto(input.logistica_estado) === "en_ejecucion"
          ? input.logistica_created_at ?? input.logistica_fecha_programada ?? null
          : input.logistica_fecha_entrega ?? input.logistica_created_at ?? null,
      actor: input.logistica_responsable ?? null,
      origen: "logistica",
      observacion:
        normalizarTexto(input.logistica_estado) === "en_ejecucion"
          ? "La logística ya registra ejecución activa."
          : "La ejecución quedó completada y superó el estado en curso.",
    },
    {
      codigo: "entrega_realizada",
      label: "Entrega realizada",
      ocurrio:
        normalizarTexto(input.logistica_estado) === "entregado" ||
        input.logistica_confirmacion_entrega === true ||
        !!input.logistica_fecha_entrega,
      fecha: input.logistica_fecha_entrega ?? input.logistica_created_at ?? null,
      actor: input.logistica_responsable ?? null,
      origen: "logistica",
      observacion:
        input.logistica_confirmacion_entrega === true
          ? "La entrega ya quedó confirmada."
          : "La logística registra entrega o ejecución finalizada.",
    },
    {
      codigo: "auditoria_iniciada",
      label: "Auditoría iniciada",
      ocurrio: !!input.tiene_auditoria,
      fecha: input.auditoria_fecha_auditoria ?? input.auditoria_created_at ?? null,
      actor: input.auditoria_responsable ?? null,
      origen: "workflow",
      observacion:
        input.tiene_auditoria
          ? "Existe registro formal de auditoría posterior a la entrega."
          : null,
    },
    {
      codigo: "auditoria_conforme",
      label: "Auditoría conforme",
      ocurrio: normalizarTexto(input.auditoria_estado) === "conforme",
      fecha: input.auditoria_fecha_auditoria ?? null,
      actor: input.auditoria_responsable ?? null,
      origen: "workflow",
      observacion:
        normalizarTexto(input.auditoria_estado) === "conforme"
          ? "La auditoría confirmó conformidad para abrir el tramo de postventa."
          : null,
    },
    {
      codigo: "auditoria_con_observaciones",
      label: "Auditoría con observaciones",
      ocurrio: normalizarTexto(input.auditoria_estado) === "con_observaciones",
      fecha: input.auditoria_fecha_auditoria ?? null,
      actor: input.auditoria_responsable ?? null,
      origen: "workflow",
      observacion:
        normalizarTexto(input.auditoria_estado) === "con_observaciones"
          ? "La auditoría quedó observada y mantiene atención pendiente."
          : null,
    },
    {
      codigo: "auditoria_requiere_correccion",
      label: "Auditoría requiere corrección",
      ocurrio: normalizarTexto(input.auditoria_estado) === "requiere_correccion",
      fecha: input.auditoria_fecha_auditoria ?? null,
      actor: input.auditoria_responsable ?? null,
      origen: "workflow",
      observacion:
        normalizarTexto(input.auditoria_estado) === "requiere_correccion"
          ? "La auditoría detectó correcciones previas a postventa."
          : null,
    },
    {
      codigo: "postventa_activada",
      label: "Postventa activada",
      ocurrio: !!input.tiene_postventa || !!postventaAbierta,
      fecha:
        input.postventa_fecha ??
        input.postventa_created_at ??
        postventaAbierta?.occurred_at ??
        null,
      actor: input.postventa_responsable ?? postventaAbierta?.actor ?? null,
      origen: postventaAbierta ? "workflow" : "postventa",
      observacion:
        postventaAbierta?.observacion ??
        (input.tiene_postventa
          ? "Existe un registro formal de postventa para el caso."
          : null),
    },
    {
      codigo: "postventa_requiere_accion",
      label: "Postventa requiere acción",
      ocurrio:
        input.postventa_requiere_accion === true ||
        normalizarTexto(input.postventa_estado) === "requiere_accion",
      fecha: input.postventa_proxima_fecha ?? input.postventa_fecha ?? null,
      actor: input.postventa_responsable ?? null,
      origen: "postventa",
      observacion:
        input.postventa_requiere_accion === true ||
        normalizarTexto(input.postventa_estado) === "requiere_accion"
          ? "La postventa mantiene una acción operativa pendiente."
          : null,
    },
    {
      codigo: "postventa_resuelta",
      label: "Postventa resuelta",
      ocurrio:
        ["resuelta", "cerrada"].includes(normalizarTexto(input.postventa_estado)) &&
        input.postventa_conformidad_final === true &&
        input.postventa_requiere_accion !== true,
      fecha: input.postventa_fecha ?? input.postventa_created_at ?? null,
      actor: input.postventa_responsable ?? null,
      origen: "postventa",
      observacion:
        ["resuelta", "cerrada"].includes(normalizarTexto(input.postventa_estado))
          ? "La postventa quedó resuelta sin remanentes operativos."
          : null,
    },
    {
      codigo: "cierre_tecnico_habilitado",
      label: "Cierre técnico habilitado",
      ocurrio: !!cierreTecnicoHabilitado,
      fecha: cierreTecnicoHabilitado?.occurred_at ?? null,
      actor: cierreTecnicoHabilitado?.actor ?? null,
      origen: "workflow",
      observacion: cierreTecnicoHabilitado?.observacion ?? null,
    },
    {
      codigo: "cierre_tecnico_realizado",
      label: "Cierre técnico realizado",
      ocurrio: !!input.tiene_cierre_tecnico || !!cierreTecnicoRegistrado,
      fecha:
        input.cierre_tecnico_fecha ??
        input.cierre_tecnico_created_at ??
        cierreTecnicoRegistrado?.occurred_at ??
        null,
      actor:
        input.cierre_tecnico_responsable ??
        cierreTecnicoRegistrado?.actor ??
        null,
      origen:
        input.tiene_cierre_tecnico
          ? "cierre_tecnico"
          : "workflow",
      observacion:
        input.cierre_tecnico_observacion ??
        input.cierre_tecnico_motivo ??
        cierreTecnicoRegistrado?.observacion ??
        null,
    },
  ];
}

function deriveExpedienteVsWorkflow(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso,
  alertas: string[]
): AlineacionWorkflow["expediente_vs_workflow"] {
  if (etapaActual === "gestion_comercial" && !input.tiene_cotizacion) {
    alertas.push(
      "El workflow comercial avanza, pero todavía no existe una cotización formal que respalde esa etapa."
    );
    return "atrasado";
  }

  if (etapaActual === "cotizacion" && !input.tiene_diagnostico) {
    alertas.push(
      "La etapa de cotización quedó activa sin un diagnóstico estructural suficiente."
    );
    return "atrasado";
  }

  if (etapaActual === "logistica_entrega" && !input.tiene_logistica) {
    alertas.push(
      "El caso ya salió de gestión comercial, pero todavía no registra un tramo formal de logística o entrega."
    );
    return "atrasado";
  }

  if (etapaActual === "postventa" && !input.tiene_postventa) {
    alertas.push(
      "El caso ya entró al tramo posterior a auditoría, pero todavía no tiene un registro formal de postventa."
    );
    return "atrasado";
  }

  if (etapaActual === "cierre_tecnico" && !input.tiene_cierre_tecnico) {
    alertas.push(
      "El caso figura técnicamente cerrado, pero todavía no tiene evidencia formal de cierre técnico."
    );
    return "atrasado";
  }

  if (etapaActual === "diagnostico" && !input.tiene_informe) {
    alertas.push(
      "El diagnóstico ya existe, pero todavía no tiene un informe técnico que lo fortalezca."
    );
    return "adelantado";
  }

  return "alineado";
}

function deriveContinuidadVsWorkflow(
  input: DerivarWorkflowDelCasoInput,
  etapaActual: EtapaCaso,
  continuidad: ContinuidadOperativa,
  alertas: string[]
): AlineacionWorkflow["continuidad_vs_workflow"] {
  if (continuidad.estado === "cerrada") {
    return "alineada";
  }

  if (continuidad.estado === "vencida") {
    alertas.push("La continuidad del caso quedó vencida respecto al workflow actual.");
    return "vencida";
  }

  if (continuidad.estado === "pendiente" || continuidad.estado === "bloqueada") {
    const accionEtapaPendiente = clasificarAccionPorEtapa(continuidad.proxima_accion);
    const continuidadNeutralValidaEnSolicitud =
      etapaActual === "solicitud" &&
      continuidad.estado === "pendiente" &&
      esContinuidadNeutralInicial(continuidad.proxima_accion);
    const continuidadInicialValidaEnSolicitud =
      etapaActual === "solicitud" &&
      continuidad.estado === "pendiente" &&
      !!continuidad.proxima_accion &&
      !!accionEtapaPendiente &&
      ["diagnostico", "gestion_comercial", "logistica_entrega", "postventa"].includes(
        accionEtapaPendiente
      );
    const continuidadCotizacionValidaEnDiagnostico =
      etapaActual === "diagnostico" &&
      continuidad.estado === "pendiente" &&
      accionEtapaPendiente === "cotizacion" &&
      !input.validacion_pendiente;
    const continuidadAuditoriaValidaConCorreccion =
      etapaActual === "auditoria" &&
      continuidad.estado === "pendiente" &&
      accionEtapaPendiente === "auditoria";

    if (
      continuidadInicialValidaEnSolicitud ||
      continuidadNeutralValidaEnSolicitud ||
      continuidadCotizacionValidaEnDiagnostico ||
      continuidadAuditoriaValidaConCorreccion
    ) {
      return "alineada";
    }

    alertas.push(
      "El expediente puede haber avanzado, pero la continuidad operativa no quedó suficientemente definida."
    );
    return "desfasada";
  }

  const accionEtapa = clasificarAccionPorEtapa(continuidad.proxima_accion);

  if (
    (etapaActual === "gestion_comercial" || etapaActual === "logistica_entrega") &&
    accionEtapa &&
    ["informe", "diagnostico"].includes(accionEtapa)
  ) {
    alertas.push(
      "La continuidad actual sigue apuntando a una fase técnica anterior al estado estructural del caso."
    );
    return "desfasada";
  }

  if (
    etapaActual === "logistica_entrega" &&
    accionEtapa &&
    ["cotizacion", "gestion_comercial"].includes(accionEtapa)
  ) {
    alertas.push(
      "La continuidad actual sigue sonando comercial, aunque el caso ya entró formalmente a logística o entrega."
    );
    return "desfasada";
  }

  if (etapaActual === "postventa" && accionEtapa === "auditoria") {
    alertas.push(
      "La continuidad actual todavía suena a auditoría, aunque el caso ya abrió un tramo formal de postventa."
    );
    return "desfasada";
  }

  if (
    etapaActual === "diagnostico" &&
    input.validacion_pendiente &&
    accionEtapa === "cotizacion"
  ) {
    alertas.push(
      "La continuidad propone cotizar, pero la validación técnica del diagnóstico todavía sigue pendiente."
    );
    return "desfasada";
  }

  if (!input.tiene_cotizacion && accionEtapa === "gestion_comercial") {
    alertas.push(
      "La continuidad propone gestión comercial sin una cotización formal registrada."
    );
    return "desfasada";
  }

  return "alineada";
}

function deriveSlaVsWorkflow(
  continuidadVsWorkflow: AlineacionWorkflow["continuidad_vs_workflow"],
  slaNivel: DerivarWorkflowDelCasoInput["sla_nivel"],
  alertas: string[]
): AlineacionWorkflow["sla_vs_workflow"] {
  if (continuidadVsWorkflow === "desfasada") {
    alertas.push(
      "El SLA actual podría estar leyendo una continuidad vieja o desalineada respecto a la etapa estructural."
    );
    return "inconsistente";
  }

  if (continuidadVsWorkflow === "vencida" && slaNivel === "verde") {
    alertas.push(
      "La continuidad figura vencida, pero el SLA no refleja esa tensión de forma consistente."
    );
    return "inconsistente";
  }

  return "coherente";
}

const TRANSITION_RULES: WorkflowTransitionRule[] =
  TRANSITION_RULES_PROCESO_ACTUAL.map((rule) => ({
    ...rule,
    origen: [...rule.origen],
  }));

function hasHito(hitos: HitoWorkflow[], codigo: HitoWorkflowCodigo) {
  return hitos.some((hito) => hito.codigo === codigo && hito.ocurrio);
}

function deriveTransitionDiagnosticoACotizacion(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[0];
  const validado = hasHito(args.hitos, "diagnostico_validado");
  const observado = hasHito(args.hitos, "diagnostico_observado");
  const rechazado = hasHito(args.hitos, "diagnostico_rechazado");
  const cotizacionEmitida = hasHito(args.hitos, "cotizacion_emitida");
  const diagnosticoRegistrado = hasHito(args.hitos, "diagnostico_registrado");
  const requiereValidacion = args.input.requiere_validacion || args.input.validacion_pendiente;
  const aplica =
    diagnosticoRegistrado ||
    ["diagnostico", "cotizacion", "gestion_comercial", "logistica_entrega", "cerrado"].includes(
      args.etapaActual
    );
  const bloqueos: string[] = [];
  const habilitadores: string[] = [];

  if (!diagnosticoRegistrado) {
    bloqueos.push("No existe diagnóstico técnico registrado.");
  }

  if (observado) {
    bloqueos.push(
      "El diagnóstico quedó observado y necesita revisión adicional antes de cotizar."
    );
  }

  if (rechazado) {
    bloqueos.push(
      "El diagnóstico fue rechazado por validación técnica y bloquea el avance a cotización."
    );
  }

  if (args.input.validacion_pendiente) {
    bloqueos.push("La validación técnica del diagnóstico sigue pendiente.");
  }

  if (diagnosticoRegistrado) {
    habilitadores.push("Existe diagnóstico técnico registrado.");
  }

  if (!requiereValidacion || validado) {
    habilitadores.push(
      validado
        ? "El diagnóstico ya fue validado formalmente."
        : "El diagnóstico no tiene validación pendiente."
    );
  }

  const resuelta =
    cotizacionEmitida ||
    ["cotizacion", "gestion_comercial", "logistica_entrega", "cerrado"].includes(
      args.etapaActual
    );

  const habilitada =
    aplica && !resuelta && diagnosticoRegistrado && !observado && !rechazado && !args.input.validacion_pendiente;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "Diagnóstico registrado y sin bloqueo de validación para abrir formalmente la fase de cotización.",
    resultado: resuelta
      ? "La cotización ya quedó habilitada o resuelta dentro del workflow."
      : habilitada
        ? "El caso puede avanzar estructuralmente a cotización."
        : "El caso todavía no puede avanzar estructuralmente a cotización.",
    bloqueos,
    habilitadores,
    observacion:
      observado || rechazado
        ? "La validación diagnóstica determina explícitamente el bloqueo estructural."
        : null,
    fecha_referencia:
      args.input.cotizacion_created_at ??
      args.input.fecha_validacion ??
      args.input.diagnostico_created_at ??
      null,
  };
}

function deriveTransitionCotizacionAGestion(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[1];
  const cotizacionEmitida = hasHito(args.hitos, "cotizacion_emitida");
  const seguimientoRegistrado = hasHito(args.hitos, "seguimiento_registrado");
  const estadoComercial = normalizarTexto(args.input.estado_comercial_real);
  const aplica =
    cotizacionEmitida ||
    ["cotizacion", "gestion_comercial", "logistica_entrega", "cerrado"].includes(
      args.etapaActual
    );
  const habilitadores: string[] = [];
  const bloqueos: string[] = [];

  if (cotizacionEmitida) {
    habilitadores.push("Existe cotización formal registrada.");
  } else {
    bloqueos.push("Todavía no existe cotización emitida.");
  }

  if (
    ["cotizado", "en_proceso", "negociacion", "esperando_cliente", "aprobado", "rechazado"].includes(
      estadoComercial
    )
  ) {
    habilitadores.push("El estado comercial ya expresa movimiento comercial activo.");
  }

  const resuelta =
    seguimientoRegistrado ||
    ["gestion_comercial", "logistica_entrega", "cerrado"].includes(args.etapaActual);
  const habilitada = aplica && !resuelta && cotizacionEmitida;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "La cotización emitida habilita el paso estructural a gestión comercial, que se resuelve al existir gestión visible o etapa comercial activa.",
    resultado: resuelta
      ? "La fase comercial estructural ya fue activada."
      : habilitada
        ? "La cotización ya permite abrir formalmente la gestión comercial."
        : "La gestión comercial estructural todavía no puede activarse.",
    bloqueos,
    habilitadores,
    observacion:
      !seguimientoRegistrado && estadoComercial === "cotizado"
        ? "La cotización existe, pero todavía no hay evidencia de gestión comercial visible."
        : null,
    fecha_referencia:
      args.input.seguimiento_created_at ?? args.input.cotizacion_created_at ?? null,
  };
}

function deriveTransitionGestionALogistica(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[2];
  const cotizacionEmitida = hasHito(args.hitos, "cotizacion_emitida");
  const clienteAprobo = hasHito(args.hitos, "cliente_aprobo");
  const clienteRechazo = hasHito(args.hitos, "cliente_rechazo");
  const aplica =
    cotizacionEmitida ||
    ["gestion_comercial", "logistica_entrega", "cerrado"].includes(args.etapaActual);
  const habilitadores: string[] = [];
  const bloqueos: string[] = [];

  if (!cotizacionEmitida) {
    bloqueos.push("Todavía no existe una cotización formal que pueda ser aprobada.");
  } else {
    habilitadores.push("Existe cotización formal registrada.");
  }

  if (clienteRechazo) {
    bloqueos.push(
      "El caso ya quedó rechazado comercialmente, por lo que no puede avanzar a la etapa posterior a aprobación."
    );
  }

  if (clienteAprobo) {
    habilitadores.push("La aprobación comercial ya fue confirmada.");
  } else {
    bloqueos.push("Aún no existe aprobación comercial confirmada.");
  }

  const resuelta = clienteAprobo && args.etapaActual === "logistica_entrega";
  const habilitada = aplica && !resuelta && cotizacionEmitida && clienteAprobo && !clienteRechazo;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "La aprobación comercial formaliza la salida del núcleo comercial hacia el downstream todavía no modelado.",
    resultado: resuelta
      ? "La aprobación comercial ya produjo la transición estructural."
      : habilitada
        ? "La aprobación comercial habilita la siguiente etapa estructural."
        : "La aprobación comercial todavía no habilita una transición estructural resuelta.",
    bloqueos,
    habilitadores,
    observacion:
      clienteAprobo && args.etapaActual !== "logistica_entrega"
        ? "La aprobación ya existe, pero el workflow todavía no refleja la etapa posterior como resuelta."
        : null,
    fecha_referencia:
      args.input.seguimiento_created_at ?? args.input.cotizacion_created_at ?? null,
  };
}

function deriveTransitionGestionACierre(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[3];
  const cotizacionEmitida = hasHito(args.hitos, "cotizacion_emitida");
  const clienteRechazo = hasHito(args.hitos, "cliente_rechazo");
  const clienteAprobo = hasHito(args.hitos, "cliente_aprobo");
  const cierreSinConversion = getPersistedTransitionByCode(
    args.input,
    "cierre_sin_conversion"
  );
  const aplica =
    cotizacionEmitida ||
    ["gestion_comercial", "cerrado"].includes(args.etapaActual);
  const habilitadores: string[] = [];
  const bloqueos: string[] = [];

  if (!cotizacionEmitida) {
    bloqueos.push("No existe una cotización formal previa para resolver el cierre sin conversión.");
  } else {
    habilitadores.push("Existe cotización formal registrada.");
  }

  if (clienteAprobo) {
    bloqueos.push(
      "El caso quedó aprobado comercialmente, por lo que no corresponde cierre sin conversión."
    );
  }

  if (clienteRechazo) {
    habilitadores.push("Existe rechazo comercial explícito del cliente.");
  } else if (cierreSinConversion) {
    habilitadores.push(
      "Existe cierre sin conversión persistido como transición formal del workflow."
    );
  } else {
    bloqueos.push("Aún no existe rechazo comercial explícito.");
  }

  const resuelta =
    !!cierreSinConversion ||
    (clienteRechazo && args.etapaActual === "cerrado");
  const habilitada =
    aplica &&
    !resuelta &&
    cotizacionEmitida &&
    clienteRechazo &&
    !clienteAprobo;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "El rechazo comercial explícito habilita el cierre estructural sin conversión.",
    resultado: resuelta
      ? "El caso ya cerró estructuralmente sin conversión."
      : habilitada
        ? "El caso puede resolverse estructuralmente como cierre sin conversión."
        : "Todavía no están dadas las condiciones para cerrar sin conversión.",
    bloqueos,
    habilitadores,
    observacion:
      cierreSinConversion?.observacion ??
      (clienteRechazo && args.etapaActual !== "cerrado"
        ? "El rechazo ya existe, pero el workflow todavía no consolidó el cierre estructural."
        : null),
    fecha_referencia:
      cierreSinConversion?.occurred_at ??
      args.input.seguimiento_created_at ??
      args.input.cotizacion_created_at ??
      null,
  };
}

function deriveTransitionAuditoriaAPostventa(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[4];
  const auditoriaIniciada = hasHito(args.hitos, "auditoria_iniciada");
  const auditoriaConforme = hasHito(args.hitos, "auditoria_conforme");
  const auditoriaConObservaciones = hasHito(
    args.hitos,
    "auditoria_con_observaciones"
  );
  const auditoriaRequiereCorreccion = hasHito(
    args.hitos,
    "auditoria_requiere_correccion"
  );
  const postventaAbierta = getPersistedTransitionByCode(
    args.input,
    "postventa_abierta"
  );
  const aplica =
    auditoriaIniciada || ["auditoria", "postventa"].includes(args.etapaActual);
  const habilitadores: string[] = [];
  const bloqueos: string[] = [];

  if (!auditoriaIniciada) {
    bloqueos.push("Todavía no existe un registro formal de auditoría.");
  } else {
    habilitadores.push("Existe auditoría formal registrada.");
  }

  if (!auditoriaConforme) {
    bloqueos.push(
      "La auditoría todavía no confirmó conformidad para abrir postventa."
    );
  } else {
    habilitadores.push("La auditoría confirmó conformidad.");
  }

  if (auditoriaConObservaciones || auditoriaRequiereCorreccion) {
    bloqueos.push(
      "La auditoría mantiene observaciones o correcciones pendientes que bloquean la apertura de postventa."
    );
  }

  const resuelta = !!postventaAbierta || args.etapaActual === "postventa";
  const habilitada =
    aplica &&
    !resuelta &&
    auditoriaIniciada &&
    auditoriaConforme &&
    !auditoriaConObservaciones &&
    !auditoriaRequiereCorreccion;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "La auditoría conforme habilita abrir postventa como siguiente etapa estructural antes del cierre técnico.",
    resultado: resuelta
      ? "La postventa ya quedó abierta de forma estructural."
      : habilitada
        ? "El caso ya puede abrir postventa formalmente."
        : "El caso todavía no puede salir de auditoría hacia postventa.",
    bloqueos,
    habilitadores,
    observacion: postventaAbierta?.observacion ?? null,
    fecha_referencia:
      postventaAbierta?.occurred_at ??
      args.input.postventa_created_at ??
      args.input.auditoria_fecha_auditoria ??
      null,
  };
}

function deriveTransitionPostventaACierre(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): WorkflowTransition {
  const rule = TRANSITION_RULES[5];
  const postventaActiva = hasHito(args.hitos, "postventa_activada");
  const postventaResuelta = hasHito(args.hitos, "postventa_resuelta");
  const postventaRequiereAccion = hasHito(
    args.hitos,
    "postventa_requiere_accion"
  );
  const cierreTecnicoHabilitado = getPersistedTransitionByCode(
    args.input,
    "cierre_tecnico_habilitado",
    ["resuelta", "habilitada"]
  );
  const cierreTecnicoRegistrado = getPersistedTransitionByCode(
    args.input,
    "cierre_tecnico_registrado"
  );
  const aplica =
    postventaActiva ||
    ["postventa", "cierre_tecnico"].includes(args.etapaActual);
  const habilitadores: string[] = [];
  const bloqueos: string[] = [];

  if (!postventaActiva) {
    bloqueos.push("Todavía no existe un registro formal de postventa.");
  } else {
    habilitadores.push("Existe postventa formal registrada.");
  }

  if (!postventaResuelta) {
    bloqueos.push(
      "La postventa todavía no quedó resuelta con conformidad final confirmada."
    );
  } else {
    habilitadores.push(
      "La postventa quedó resuelta sin acciones operativas remanentes."
    );
  }

  if (postventaRequiereAccion) {
    bloqueos.push("La postventa mantiene acciones pendientes antes del cierre técnico.");
  }

  const resuelta =
    !!cierreTecnicoRegistrado || args.etapaActual === "cierre_tecnico";
  const habilitada =
    aplica &&
    !resuelta &&
    (postventaActiva || !!cierreTecnicoHabilitado) &&
    postventaResuelta &&
    !postventaRequiereAccion;

  return {
    ...rule,
    estado: !aplica ? "no_aplica" : resuelta ? "resuelta" : habilitada ? "habilitada" : "bloqueada",
    efectiva: resuelta,
    condicion:
      "La postventa resuelta y sin remanentes habilita el cierre técnico como siguiente acto formal.",
    resultado: resuelta
      ? "El cierre técnico ya quedó registrado como etapa formal final."
      : habilitada
        ? "El caso ya puede pasar a cierre técnico."
        : "La postventa todavía no habilita el cierre técnico.",
    bloqueos,
    habilitadores,
    observacion:
      cierreTecnicoRegistrado?.observacion ??
      cierreTecnicoHabilitado?.observacion ??
      null,
    fecha_referencia:
      cierreTecnicoRegistrado?.occurred_at ??
      args.input.cierre_tecnico_fecha ??
      cierreTecnicoHabilitado?.occurred_at ??
      args.input.postventa_proxima_fecha ??
      args.input.postventa_fecha ??
      null,
  };
}

function deriveTransitionResult(args: {
  input: DerivarWorkflowDelCasoInput;
  etapaActual: EtapaCaso;
  hitos: HitoWorkflow[];
}): TransitionResult {
  const lista = [
    deriveTransitionDiagnosticoACotizacion(args),
    deriveTransitionCotizacionAGestion(args),
    deriveTransitionGestionALogistica(args),
    deriveTransitionGestionACierre(args),
    deriveTransitionAuditoriaAPostventa(args),
    deriveTransitionPostventaACierre(args),
  ];

  const prioridadKeys = obtenerTransicionesPrioritariasPorEtapaProcesoActual(
    args.etapaActual
  );
  const candidatos =
    prioridadKeys.length > 0
      ? prioridadKeys
          .map((key) => lista.find((item) => item.key === key) ?? null)
          .filter((item): item is WorkflowTransition => !!item)
      : lista.filter((item) => item.estado !== "no_aplica");
  const actual =
    candidatos.find((item) => item.estado === "bloqueada") ??
    candidatos.find((item) => item.estado === "habilitada") ??
    candidatos.find((item) => item.efectiva) ??
    null;
  const bloqueosActivos = lista
    .filter((item) => item.estado === "bloqueada")
    .flatMap((item) => item.bloqueos);
  const habilitadoresActivos = lista
    .filter((item) => item.estado === "habilitada" || item.estado === "resuelta")
    .flatMap((item) => item.habilitadores);

  const resumen =
    bloqueosActivos.length > 0
      ? {
          estado: "bloqueado" as const,
          descripcion:
            "El núcleo estructural del caso tiene transiciones críticas bloqueadas que todavía impiden o condicionan su avance.",
        }
      : lista.some((item) => item.estado === "habilitada")
        ? {
            estado: "condicionado" as const,
            descripcion:
              "El núcleo estructural del caso ya tiene una transición crítica habilitada, pero aún no consolidada como resuelta.",
          }
        : {
            estado: "fluido" as const,
            descripcion:
              "Las transiciones críticas del núcleo del caso se encuentran resueltas o sin bloqueos visibles en esta lectura.",
          };

  return {
    actual,
    lista,
    bloqueos_activos: bloqueosActivos,
    habilitadores_activos: habilitadoresActivos,
    resumen,
  };
}

export function derivarWorkflowDelCaso(
  input: DerivarWorkflowDelCasoInput
): WorkflowDelCaso {
  const etapaActual = deriveEtapaActual(input);
  const estadoWorkflow = deriveEstadoWorkflow(input, etapaActual);
  const logistica = deriveLogistica(input);
  const continuidad = deriveContinuidad(input, etapaActual);
  const hitos = buildHitos(input);
  const alertas: string[] = [];
  const expedienteVsWorkflow = deriveExpedienteVsWorkflow(
    input,
    etapaActual,
    alertas
  );
  const continuidadVsWorkflow = deriveContinuidadVsWorkflow(
    input,
    etapaActual,
    continuidad,
    alertas
  );
  const slaVsWorkflow = deriveSlaVsWorkflow(
    continuidadVsWorkflow,
    input.sla_nivel,
    alertas
  );
  const transiciones = deriveTransitionResult({
    input,
    etapaActual,
    hitos,
  });

  return {
    caso_id: input.caso_id,
    version: 1,
    etapa_actual: etapaActual,
    estado_workflow: estadoWorkflow,
    etapas: deriveEtapas(input, etapaActual, estadoWorkflow),
    hitos,
    logistica,
    auditoria: deriveAuditoria(input, etapaActual),
    postventa: derivePostventa(input, etapaActual),
    cierre_tecnico: deriveCierreTecnico(input, etapaActual),
    continuidad,
    alineacion: {
      expediente_vs_workflow: expedienteVsWorkflow,
      continuidad_vs_workflow: continuidadVsWorkflow,
      sla_vs_workflow: slaVsWorkflow,
      alertas,
    },
    transiciones,
    cierre:
      etapaActual === "postventa"
        ? {
            resultado_final: "postventa_activa",
            fecha_cierre: input.postventa_fecha ?? input.postventa_created_at ?? null,
            motivo_cierre:
              "El caso permanece en servicio postventa antes del cierre técnico final.",
          }
        : etapaActual === "cierre_tecnico"
        ? {
            resultado_final: "cierre_tecnico_realizado",
            fecha_cierre:
              input.cierre_tecnico_fecha ??
              input.cierre_tecnico_created_at ??
              null,
            motivo_cierre:
              input.cierre_tecnico_motivo ??
              "El caso completó postventa y quedó técnicamente cerrado.",
          }
        : etapaActual === "cerrado"
        ? {
            resultado_final:
              getPersistedTransitionByCode(input, "cierre_sin_conversion") ||
              normalizarTexto(input.estado_comercial_real) === "rechazado"
                ? "cerrado_sin_conversion"
                : "rechazado",
            fecha_cierre:
              getPersistedTransitionByCode(input, "cierre_sin_conversion")
                ?.occurred_at ??
              input.seguimiento_created_at ??
              input.cotizacion_created_at ??
              null,
            motivo_cierre:
              getPersistedTransitionByCode(input, "cierre_sin_conversion") ||
              normalizarTexto(input.estado_comercial_real) === "rechazado"
                ? "El caso fue cerrado por rechazo comercial."
                : "El caso llegó a un estado cerrado derivado desde el flujo actual.",
          }
        : undefined,
    metadata: {
      created_at: input.created_at ?? null,
      updated_at: resolveUpdatedAt(input),
      ultima_transicion_at: deriveUltimaTransicionAt(input, etapaActual),
      ultima_transicion_por: deriveUltimaTransicionPor(input),
      derivado_desde: [
        "casos",
        ...(input.tiene_informe ? (["informes_tecnicos"] as const) : []),
        ...(input.tiene_diagnostico ? (["diagnosticos"] as const) : []),
        ...(input.tiene_cotizacion ? (["cotizaciones"] as const) : []),
        ...(input.tiene_seguimiento ? (["seguimientos"] as const) : []),
        ...(input.tiene_logistica ? (["logisticas_entrega"] as const) : []),
        ...(input.tiene_postventa ? (["postventas"] as const) : []),
        ...(input.tiene_cierre_tecnico ? (["cierres_tecnicos"] as const) : []),
        ...((input.workflow_transitions?.length ?? 0) > 0
          ? (["workflow_transitions"] as const)
          : []),
      ],
    },
  };
}
