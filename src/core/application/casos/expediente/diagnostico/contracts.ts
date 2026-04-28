import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type DiagnosticoAction =
  | "registrar_diagnostico"
  | "actualizar_diagnostico";

export type DiagnosticoResultadoValidacion =
  | "validado"
  | "observado"
  | "rechazado";

export type DiagnosticoCommand = {
  caso_id: string;
  accion: DiagnosticoAction;
  diagnostico_id?: string | null;
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
  actor?: string | null;
};

export type DiagnosticoValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type DiagnosticoValidacionCommand = {
  caso_id: string;
  diagnostico_id: string;
  payload: {
    resultado_validacion: DiagnosticoResultadoValidacion;
    fecha_validacion?: string | null;
    validado_por?: string | null;
    observacion_validacion?: string | null;
  };
  actor?: string | null;
};

export type DiagnosticoValidacionValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type DiagnosticoChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type DiagnosticoResult = {
  ok: boolean;
  caso_id: string;
  accion: DiagnosticoAction;
  diagnostico_id?: string | null;
  cambios: DiagnosticoChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};

export type DiagnosticoValidacionResult = {
  ok: boolean;
  caso_id: string;
  diagnostico_id: string;
  cambios: DiagnosticoChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
