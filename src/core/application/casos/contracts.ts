import type { MacroareaCaso, RiesgoCaso } from "@/lib/domain/casos";
import type { EstadoCasoNormalizado, EtapaCaso } from "@/core/domain/casos";
import type { ResponsabilidadOperativaCaso } from "@/core/domain/casos/responsabilidad-operativa";

export type CasoWorklistItem = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  proyecto: string;
  created_at: string | null;
  prioridad: string | null;
  estado: EstadoCasoNormalizado;
  estado_label: string;
  estado_tecnico_real: string;
  estado_comercial_real: string;
  proxima_accion_real: string | null;
  proxima_fecha_real: string | null;
  riesgo: RiesgoCaso;
  sla: string;
  requiere_validacion: boolean;
  validacion_pendiente?: boolean;
  validacion_resuelta?: boolean;
  resultado_validacion?: string | null;
  recomendacion_accion: string;
  recomendacion_urgencia: "alta" | "media" | "baja";
  recomendacion_motivo: string;
  recomendacion_fecha: string | null;
  workflow_etapa_actual?: EtapaCaso;
  workflow_estado?: "activo" | "pausado" | "cerrado" | "cancelado";
  workflow_continuidad_estado?:
    | "al_dia"
    | "cerrada"
    | "pendiente"
    | "vencida"
    | "en_espera"
    | "bloqueada";
  workflow_continuidad_origen?: "manual" | "derivado" | "workflow";
  workflow_alineacion_expediente?: "alineado" | "adelantado" | "atrasado";
  workflow_alineacion_continuidad?: "alineada" | "desfasada" | "vencida";
  workflow_alineacion_sla?: "coherente" | "inconsistente";
  workflow_alertas?: string[];
  workflow_ultima_transicion_at?: string | null;
  workflow_transicion_actual?: string | null;
  workflow_transicion_estado?: "no_aplica" | "bloqueada" | "habilitada" | "resuelta" | null;
  workflow_transicion_destino?: EtapaCaso | null;
  workflow_transicion_bloqueos?: string[];
  macroarea_actual: MacroareaCaso;
  macroarea_siguiente: MacroareaCaso | null;
  macroarea_label: string;
  macroarea_orden: number;
  macroarea_motivo: string;
  responsable_actual_raw: string | null;
  responsable_humano_id: string | null;
  responsable_humano: string | null;
  responsable_humano_label: string;
  responsable_humano_asignado_por: string | null;
  responsable_humano_asignado_at: string | null;
  agente_ia_activo: ResponsabilidadOperativaCaso["agente_ia_activo"];
  agente_operativo_activo: ResponsabilidadOperativaCaso["agente_operativo_activo"];
  nivel_confianza_cliente: string;
  nivel_friccion_cliente: string;
  desgaste_operativo: string;
  claridad_intencion: string;
  probabilidad_conversion: string;
  observacion_relacional: string;
};

export type CasosWorklistMeta = {
  total: number;
  riesgo_alto: number;
  sin_proxima_fecha: number;
  sin_proxima_accion: number;
  validacion_pendiente: number;
  orden_default_aplicado: "worklist_operativa";
};

export type CasosBulkUpdateItem = {
  id: string;
  cliente: string;
  proyecto: string;
  riesgo: RiesgoCaso;
  estado_comercial_real: string;
  proxima_fecha_real: string | null;
  recomendacion_accion: string;
  recomendacion_urgencia: "alta" | "media" | "baja";
  recomendacion_fecha: string | null;
};

export type GetCasosNormalizadosResult = {
  items: CasoWorklistItem[];
  meta: CasosWorklistMeta;
  bulk_items: CasosBulkUpdateItem[];
};
