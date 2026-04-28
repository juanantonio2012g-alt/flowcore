import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type CotizacionAction =
  | "registrar_cotizacion"
  | "actualizar_cotizacion";

export type CotizacionCommand = {
  caso_id: string;
  accion: CotizacionAction;
  cotizacion_id?: string | null;
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
  actor?: string | null;
};

export type CotizacionValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type CotizacionChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type CotizacionResult = {
  ok: boolean;
  caso_id: string;
  accion: CotizacionAction;
  cotizacion_id?: string | null;
  cambios: CotizacionChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
