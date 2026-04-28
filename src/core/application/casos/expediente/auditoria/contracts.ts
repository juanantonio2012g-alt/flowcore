import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type AuditoriaAction = "registrar_auditoria" | "actualizar_auditoria";

export type AuditoriaCommand = {
  caso_id: string;
  accion: AuditoriaAction;
  auditoria_id?: string | null;
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
  actor?: string | null;
};

export type AuditoriaValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type AuditoriaChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type AuditoriaResult = {
  ok: boolean;
  caso_id: string;
  accion: AuditoriaAction;
  auditoria_id?: string | null;
  cambios: AuditoriaChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
