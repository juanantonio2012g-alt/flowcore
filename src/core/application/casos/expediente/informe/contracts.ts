import type { ActionIssue, ActionWarning } from "@/core/application/casos/actions";

export type InformeAction = "registrar_informe" | "actualizar_informe";

export type InformeEvidenciaInput = {
  archivo_path: string;
  archivo_url: string;
  nombre_archivo: string;
  descripcion?: string | null;
  tipo?: string | null;
};

export type InformeCommand = {
  caso_id: string;
  accion: InformeAction;
  informe_id?: string | null;
  payload: {
    fecha_recepcion?: string | null;
    resumen_tecnico?: string | null;
    hallazgos_principales?: string | null;
    estado_revision?: string | null;
    evidencias?: InformeEvidenciaInput[];
  };
  actor?: string | null;
};

export type InformeValidation = {
  ok: boolean;
  errores: ActionIssue[];
  advertencias: ActionWarning[];
};

export type InformeChange = {
  campo: string;
  anterior?: string | null;
  nuevo?: string | null;
};

export type InformeResult = {
  ok: boolean;
  caso_id: string;
  accion: InformeAction;
  informe_id?: string | null;
  cambios: InformeChange[];
  errores: ActionIssue[];
  advertencias: ActionWarning[];
  metadata: {
    timestamp: string;
    origen: string;
  };
};
