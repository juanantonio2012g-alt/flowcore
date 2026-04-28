import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type SeguimientoAction =
  | "registrar_seguimiento"
  | "actualizar_seguimiento";

export type SeguimientoCommand = {
  caso_id: string;
  accion: SeguimientoAction;
  seguimiento_id?: string | null;
  payload: {
    tipo_seguimiento?: string | null;
    resultado?: string | null;
    proximo_paso?: string | null;
    proxima_fecha?: string | null;
    estado_comercial?: string | null;
    senales_comerciales?: string[] | null;
    observaciones_cliente?: string | null;
  };
  actor?: string | null;
};

export type SeguimientoValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type SeguimientoChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type SeguimientoResult = {
  ok: boolean;
  caso_id: string;
  accion: SeguimientoAction;
  seguimiento_id?: string | null;
  cambios: SeguimientoChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
