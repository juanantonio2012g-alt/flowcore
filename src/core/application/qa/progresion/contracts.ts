export type ValorEsperado<T> = T | T[];

export type ObservablesProgresion = {
  workflow_etapa_actual?: ValorEsperado<string | null>;
  workflow_continuidad_estado?: ValorEsperado<string | null>;
  recomendacion_operativa_accion?: ValorEsperado<string | null>;
  proxima_accion?: ValorEsperado<string | null>;
  macroarea_actual?: ValorEsperado<string | null>;
  alineacion_operativa_estado?: ValorEsperado<string | null>;
  priorizacion_agente_alineacion?: ValorEsperado<string | null>;
};

export type ProgresionAltaInput = {
  cliente: string;
  proyecto: string;
  canal: string;
  prioridad: "urgente" | "alta" | "media" | "baja";
  descripcion: string;
};

export type PasoDiagnostico = {
  kind: "diagnostico";
  accion: "registrar_diagnostico";
  actor?: string | null;
  payload: {
    problematica_identificada?: string | null;
    causa_probable?: string | null;
    nivel_certeza?: string | null;
    categoria_caso?: string | null;
    solucion_recomendada?: string | null;
    producto_recomendado?: string | null;
    proceso_sugerido?: string | null;
    observaciones_tecnicas?: string | null;
    requiere_validacion?: boolean;
    fecha_validacion?: string | null;
  };
};

export type PasoCotizacion = {
  kind: "cotizacion";
  accion: "registrar_cotizacion";
  actor?: string | null;
  payload: {
    fecha_cotizacion?: string | null;
    solucion_asociada?: string | null;
    productos_incluidos?: string | null;
    cantidades?: string | null;
    condiciones?: string | null;
    observaciones?: string | null;
    monto?: number | null;
    estado?: string | null;
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
  };
};

export type PasoSeguimiento = {
  kind: "seguimiento";
  accion: "registrar_seguimiento";
  actor?: string | null;
  payload: {
    tipo_seguimiento?: string | null;
    resultado?: string | null;
    proximo_paso?: string | null;
    proxima_fecha?: string | null;
    estado_comercial?: string | null;
    senales_comerciales?: string[] | null;
    observaciones_cliente?: string | null;
  };
};

export type PasoLogistica = {
  kind: "logistica";
  accion: "registrar_logistica";
  actor?: string | null;
  payload: {
    fecha_programada?: string | null;
    responsable?: string | null;
    estado_logistico?: string | null;
    observacion_logistica?: string | null;
    confirmacion_entrega?: boolean | null;
    fecha_entrega?: string | null;
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
  };
};

export type PasoAuditoria = {
  kind: "auditoria";
  accion: "registrar_auditoria";
  actor?: string | null;
  payload: {
    fecha_auditoria?: string | null;
    responsable_auditoria?: string | null;
    estado_auditoria?: string | null;
    observaciones_auditoria?: string | null;
    conformidad_cliente?: boolean | null;
    requiere_correccion?: boolean | null;
    fecha_cierre_tecnico?: string | null;
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
  };
};

export type ProgresionStepCommand =
  | PasoDiagnostico
  | PasoCotizacion
  | PasoSeguimiento
  | PasoLogistica
  | PasoAuditoria;

export type ProgresionScenarioStep = {
  id: string;
  label: string;
  command: ProgresionStepCommand;
  expected: ObservablesProgresion;
};

export type ProgresionScenarioFixture = {
  id: string;
  titulo: string;
  alta: ProgresionAltaInput;
  expected_after_alta: ObservablesProgresion;
  steps: ProgresionScenarioStep[];
};
