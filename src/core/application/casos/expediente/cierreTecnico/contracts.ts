import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type CierreTecnicoAction = "registrar_cierre_tecnico";

export type CierreTecnicoCommand = {
  caso_id: string;
  accion: CierreTecnicoAction;
  payload: {
    fecha_cierre_tecnico?: string | null;
    responsable_cierre?: string | null;
    motivo_cierre?: string | null;
    observacion_cierre?: string | null;
    postventa_resuelta?: boolean | null;
    requiere_postventa_adicional?: boolean | null;
  };
  actor?: string | null;
};

export type CierreTecnicoValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type CierreTecnicoChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type CierreTecnicoResult = {
  ok: boolean;
  caso_id: string;
  accion: CierreTecnicoAction;
  cierre_tecnico_id?: string | null;
  cambios: CierreTecnicoChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
