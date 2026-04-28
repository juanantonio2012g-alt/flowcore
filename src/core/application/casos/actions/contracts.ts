export type BulkUpdateAction =
  | "actualizacion_manual"
  | "aplicar_sugerencia";

export type QuickUpdateAction =
  | "actualizacion_manual"
  | "aplicar_sugerencia";

export type ActionIssue = {
  caso_id?: string;
  codigo: string;
  mensaje: string;
};

export type ActionWarning = {
  caso_id?: string;
  codigo: string;
  mensaje: string;
};

export type BulkUpdateCommand = {
  caso_ids: string[];
  accion: BulkUpdateAction;
  payload?: {
    proxima_fecha?: string | null;
    estado_comercial?: string | null;
  };
  actor?: string | null;
};

export type QuickUpdateCommand = {
  caso_id: string;
  accion: QuickUpdateAction;
  payload?: {
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
    estado_comercial?: string | null;
  };
  actor?: string | null;
};

export type AsignarResponsableHumanoCommand = {
  caso_id: string;
  payload?: {
    responsable_humano_id?: string | null;
  };
  actor?: string | null;
};

export type BulkUpdateIssue = ActionIssue;
export type BulkUpdateWarning = ActionWarning;

export type BulkUpdateValidation = {
  ok: boolean;
  errores: BulkUpdateIssue[];
  advertencias: BulkUpdateWarning[];
};

export type BulkUpdateCaseChange = {
  caso_id: string;
  estado_anterior?: string | null;
  estado_nuevo?: string | null;
  resultado: "actualizado" | "omitido" | "error";
  mensaje?: string | null;
};

export type BulkUpdateResult = {
  ok: boolean;
  accion: BulkUpdateAction;
  total_recibidos: number;
  total_actualizados: number;
  total_omitidos: number;
  cambios: BulkUpdateCaseChange[];
  errores: BulkUpdateIssue[];
  advertencias: BulkUpdateWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};

export type QuickUpdateChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type QuickUpdateValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type QuickUpdateResult = {
  ok: boolean;
  caso_id: string;
  accion: QuickUpdateAction;
  cambios: QuickUpdateChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};

export type AsignarResponsableHumanoResult = {
  ok: boolean;
  caso_id: string;
  cambios: QuickUpdateChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: "opencore-asignacion-humana";
  };
};
