import type { CasoWorklistItem } from "@/core/application/casos";
import type { SemanticaCasoOperativo } from "@/core/application/organigrama/semantica";
import type { EventoBase } from "@/lib/eventos/casos";
import type { MacroareaCaso, RiesgoCaso, SenalDelegacion } from "@/lib/domain/casos";

export type DashboardResumen = {
  activos: number;
  riesgo_alto: number;
  validaciones_pendientes: number;
  delegacion_alta: number;
};

export type DashboardSintesis = {
  estado_general: string;
  presion_dominante: string;
  pendiente_principal: DashboardPendientePrincipal;
};

export type DashboardResumenLecturas = {
  activos: string;
  riesgo_alto: string;
  validaciones_pendientes: string;
  delegacion_alta: string;
};

export type DashboardDecisionNivel = "alta" | "media" | "base";

export type DashboardDecisionItem = {
  key: "prioridad" | "concentracion" | "orden" | "espera";
  titulo: string;
  decision: string;
  detalle: string;
  nivel: DashboardDecisionNivel;
  href: string | null;
  href_label: string | null;
};

export type DashboardBloqueResumen = {
  titulo: string;
  descripcion: string;
};

export type DashboardPendientePrincipal =
  | {
      modo: "individual";
      caso_id: string;
      titulo: string;
      descripcion: string;
      macroarea: MacroareaCaso;
      macroarea_label: string;
    }
  | {
      modo: "agregado";
      titulo: string;
      descripcion: string;
      cantidad_casos: number;
      macroarea: MacroareaCaso;
      macroarea_label: string;
      casos_ids: string[];
    };

export type DashboardFocoContexto =
  | {
      modo: "individual";
      titulo: string;
      descripcion: string;
      caso_id: string | null;
    }
  | {
      modo: "agregado";
      titulo: string;
      descripcion: string;
      cantidad_casos: number;
      casos_ids: string[];
      resumen: string;
    };

export type DashboardMacroareaItem = {
  macroarea: MacroareaCaso;
  macroarea_label: string;
  macroarea_orden: number;
  activos: number;
  bloqueados: number;
  vencidos: number;
  riesgo_alto: number;
  delegacion: SenalDelegacion;
  delegacion_motivo: string;
};

export type DashboardFocoItem = {
  id: string;
  cliente_id: string | null;
  cliente: string;
  proyecto: string;
  macroarea_actual: MacroareaCaso;
  macroarea_label: string;
  riesgo: RiesgoCaso;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  semantica: SemanticaCasoOperativo;
};

export type DashboardClienteItem = {
  id: string | null;
  nombre: string;
  empresa: string;
  total: number;
  activos: number;
  riesgo: number;
  motivo_foco: string;
};

export type DashboardActividadItem = EventoBase;

export type DashboardReadModel = {
  sintesis: DashboardSintesis;
  decisiones: DashboardDecisionItem[];
  resumen: DashboardResumen;
  resumen_lecturas: DashboardResumenLecturas;
  macroareas: DashboardMacroareaItem[];
  foco_contexto: DashboardFocoContexto;
  foco: DashboardFocoItem[];
  clientes_resumen: DashboardBloqueResumen;
  clientes: DashboardClienteItem[];
  actividad_resumen: DashboardBloqueResumen;
  actividad: DashboardActividadItem[];
  metadata: {
    origen: string;
    timestamp: string;
    total_casos: number;
    orden_base: "worklist_operativa";
  };
};

export type DerivarDashboardReadModelInput = {
  items: CasoWorklistItem[];
  meta: {
    total: number;
    riesgo_alto: number;
    validacion_pendiente: number;
    orden_default_aplicado: "worklist_operativa";
  };
};
