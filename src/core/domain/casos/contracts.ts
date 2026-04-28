import type {
  CasoBaseDominio,
  CasoDerivadosDominio,
  MacroareaCaso,
  RiesgoCaso,
} from "@/lib/domain/casos";
import type { EstadoCasoNormalizado } from "./types";
import type { WorkflowDelCaso } from "./workflow";

export type CasoInput = {
  caso: CasoBaseDominio;
  derivados?: CasoDerivadosDominio;
  metadata?: {
    origen?: string;
    timestamp?: string;
  };
};

export type CasoNormalizado = {
  id: string;
  estado: EstadoCasoNormalizado;
  estado_label: string;
  workflow: WorkflowDelCaso;
  macroarea_actual: MacroareaCaso;
  macroarea_siguiente: MacroareaCaso | null;
  macroarea_label: string;
  macroarea_orden: number;
  riesgo: RiesgoCaso;
  sla: {
    nivel: "rojo" | "amarillo" | "verde";
    etiqueta: string;
    descripcion: string;
  };
  proxima_accion: string | null;
  proxima_fecha: string | null;
  recomendacion_operativa: {
    accion: string;
    urgencia: "alta" | "media" | "baja";
    motivo: string;
    fecha_sugerida: string | null;
  };
  metadata: {
    origen: string;
    timestamp: string;
    cliente_id: string | null;
    cliente: string;
    empresa: string;
    created_at: string | null;
    prioridad: string | null;
    estado_tecnico_real: string;
    estado_comercial_real: string;
    requiere_validacion: boolean;
    requiere_validacion_manual: boolean;
    requiere_validacion_derivada: boolean;
    motivo_validacion: string[];
    motivos_validacion?: string[];
    validacion_pendiente?: boolean;
    validacion_resuelta?: boolean;
    resultado_validacion?: string | null;
    validado_por?: string | null;
    fecha_validacion?: string | null;
    observacion_validacion?: string | null;
    nivel_confianza_cliente: string;
    nivel_friccion_cliente: string;
    desgaste_operativo: string;
    claridad_intencion: string;
    probabilidad_conversion: string;
    observacion_relacional: string;
    macroarea_motivo: string;
  };
};
