import type { SenalDelegacion } from "@/lib/domain/casos";

export type OrganigramaCarga = "baja" | "media" | "alta";
export type OrganigramaEstado = "estable" | "atencion" | "critico";
export type OrganigramaEstadoContexto = "normal" | "incidencia";

export type OrganigramaSubmodulo = {
  key: string;
  label: string;
  tipo: "estructural";
  estado_label: string;
  descripcion: string;
};

export type OrganigramaFocoActual = {
  caso_id: string;
  cliente: string;
  etapa: string | null;
  etapa_label: string;
  accion_actual: string;
  estado_contexto: OrganigramaEstadoContexto;
  estado_contexto_label: string;
};

export type OrganigramaFlujoTramo = {
  key: string;
  label: string;
  responsable_key: OrganigramaMacroareaItem["key"];
  responsable_label: string;
  responsable_color: OrganigramaMacroareaItem["color"];
  total_casos: number;
  incidencias: number;
  foco_actual: OrganigramaFocoActual | null;
};

export type OrganigramaMacroareaItem = {
  key: string;
  label: string;
  orden: number;
  total: number;
  activos: number;
  bloqueados: number;
  vencidos: number;
  en_riesgo: number;
  carga: OrganigramaCarga;
  estado: OrganigramaEstado;
  delegacion: SenalDelegacion;
  delegacion_motivo: string;
  descripcion: string;
  responsable: string;
  color: "blue" | "emerald" | "violet" | "amber";
  detalle: string;
  movimiento: string;
  foco_actual: OrganigramaFocoActual | null;
  cola_href: string;
  area_href: string;
  submodulos: OrganigramaSubmodulo[];
};

export type OrganigramaReadModel = {
  resumen: {
    total_casos: number;
    bloqueados: number;
    vencidos: number;
  };
  direccion: string;
  flujo: {
    descripcion: string;
    tramos: OrganigramaFlujoTramo[];
  };
  macroareas: OrganigramaMacroareaItem[];
  metadata: {
    origen: string;
    timestamp: string;
  };
};
