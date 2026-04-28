import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type LogisticaAction =
  | "registrar_logistica"
  | "actualizar_logistica";

export type LogisticaCommand = {
  caso_id: string;
  accion: LogisticaAction;
  logistica_id?: string | null;
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
  actor?: string | null;
};

export type LogisticaValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type LogisticaChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type LogisticaResult = {
  ok: boolean;
  caso_id: string;
  accion: LogisticaAction;
  logistica_id?: string | null;
  cambios: LogisticaChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
