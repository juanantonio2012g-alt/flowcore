import type {
  CasoWorklistItem,
  CasosBulkUpdateItem,
} from "@/core/application/casos";
import type { SemanticaCasoOperativo } from "@/core/application/organigrama";
import type { EventoBase } from "@/lib/eventos/casos";

export type ClienteFocoOperativo = {
  caso_id: string;
  ownership_operativo: string;
  semantica: SemanticaCasoOperativo;
};

export type ClienteRelacionalItem = {
  id: string;
  nombre: string;
  empresa: string;
  total_casos: number;
  casos_activos: number;
  casos_riesgo: number;
  friccion: string;
  conversion: string;
  indice_atencion: number;
  foco_operativo: ClienteFocoOperativo | null;
};

export type ClientesResumen = {
  total: number;
  con_casos_activos: number;
  con_riesgo: number;
  con_friccion_alta: number;
};

export type ClientesReadModel = {
  resumen: ClientesResumen;
  items: ClienteRelacionalItem[];
  metadata: {
    origen: string;
    timestamp: string;
    total_casos_base: number;
    orden_base: "indice_atencion_desc";
  };
};

export type ClienteDetalleCasoItem = {
  id: string;
  titulo: string | null;
  prioridad: string | null;
  estado: CasoWorklistItem["estado"];
  estado_label: string;
  estado_comercial: string;
  macroarea_actual: CasoWorklistItem["macroarea_actual"];
  macroarea_label: string;
  riesgo: CasoWorklistItem["riesgo"];
  sla: string;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  recomendacion_accion: string;
  recomendacion_urgencia: "alta" | "media" | "baja";
  recomendacion_motivo: string;
  recomendacion_fecha: string | null;
  requiere_validacion: boolean;
  ownership_operativo: string;
  semantica_operativa: SemanticaCasoOperativo;
};

export type ClienteDetalleMovimiento = {
  id: string;
  caso_id: string;
  tipo: "Seguimiento" | "Cotización";
  detalle: string;
  fecha: string | null;
};

export type ClienteDetalleAlerta = {
  codigo: string;
  label: string;
  severidad: "info" | "warning" | "critical";
};

export type ClienteDetalleIntervencion = {
  accion: string;
  urgencia: "alta" | "media" | "baja";
  total: number;
  casos: string[];
  motivo: string;
  fecha: string | null;
};

export type ClienteDetalleReadModel = {
  cliente: {
    id: string;
    nombre: string;
    empresa: string | null;
    segmento: string | null;
  };
  resumen: {
    total_casos: number;
    activos: number;
    en_riesgo: number;
    con_proxima_fecha: number;
    validaciones_pendientes: number;
    vencidos_sla: number;
    ultimo_movimiento: string | null;
  };
  estado_relacional: {
    confianza: string;
    friccion: string;
    desgaste: string;
    claridad: string;
    conversion: string;
    observacion: string;
    prioridad_relacional: string;
    lectura_vinculo: string;
  };
  casos: ClienteDetalleCasoItem[];
  actividad: EventoBase[];
  movimientos: ClienteDetalleMovimiento[];
  alertas: ClienteDetalleAlerta[];
  intervenciones: ClienteDetalleIntervencion[];
  bulk_items: CasosBulkUpdateItem[];
  metadata: {
    origen: string;
    timestamp: string;
  };
};
