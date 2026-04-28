import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type PostventaAction = "registrar_postventa" | "actualizar_postventa";

export type PostventaCommand = {
  caso_id: string;
  accion: PostventaAction;
  postventa_id?: string | null;
  payload: {
    fecha_postventa?: string | null;
    estado_postventa?: string | null;
    observacion_postventa?: string | null;
    requiere_accion?: boolean | null;
    proxima_accion?: string | null;
    proxima_fecha?: string | null;
    conformidad_final?: boolean | null;
    responsable_postventa?: string | null;
    notas?: string | null;
  };
  actor?: string | null;
};

export type PostventaValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type PostventaChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type PostventaResult = {
  ok: boolean;
  caso_id: string;
  accion: PostventaAction;
  postventa_id?: string | null;
  cambios: PostventaChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
