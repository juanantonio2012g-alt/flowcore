import type { CasoInput, CasoNormalizado } from "@/core/domain/casos";
import type { AgentePriorizacionOutput } from "@/core/application/agentes/priorizacion";
import type { AlertaTaxonomica } from "@/lib/domain/casos";
import type {
  AuditoriaEstado,
  PostventaEstado,
} from "@/lib/domain/casos/types";
import type {
  FamiliaAlertaDetalle,
  EstadoAlineacionOperativa,
  EstadoExpediente,
  EstadoRelacionalGeneral,
  EstadoResumenExpediente,
  EstadoVisualModuloTipo,
  SeveridadDetalle,
  SeveridadWarningEstructural,
} from "./types";
import type { ResponsabilidadOperativaCaso } from "../responsabilidad-operativa";

export type CambioBitacoraDetalle = {
  id: string;
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string | null;
  created_at: string;
};

export type TimelineDetalle = {
  titulo: string;
  fecha: string | null;
  detalle: string;
};

export type AlertaDetalle = {
  codigo: string;
  label: string;
  severidad: SeveridadDetalle;
  familia: FamiliaAlertaDetalle;
  familia_label: string;
  taxonomia: AlertaTaxonomica;
};

export type GrupoAlertasDetalle = {
  key: FamiliaAlertaDetalle;
  label: string;
  descripcion: string;
  alertas: AlertaDetalle[];
};

export type SintesisTrazabilidadDetalle = {
  actividad_reciente: string;
  alerta_dominante: string | null;
  cobertura_registro: string;
};

export type OwnershipActivoDetalle = {
  key:
    | "responsable_actual"
    | "creado_por"
    | "diagnostico_por"
    | "cotizacion_por"
    | "seguimiento_por";
  label: string;
  valor: string;
};

export type OwnershipResumenDetalle = {
  label: string;
  descripcion: string;
  total_activos: number;
  vacio: boolean;
};

export type InformeDetalleData = {
  id: string;
  fecha_recepcion: string | null;
  resumen_tecnico: string | null;
  hallazgos_principales: string | null;
  estado_revision: string | null;
  created_at: string | null;
} | null;

export type EvidenciaDetalleData = Array<{
  id: string;
  archivo_path: string;
  archivo_url: string;
  nombre_archivo: string | null;
  descripcion: string | null;
  tipo: string | null;
  created_at: string;
}>;

export type DiagnosticoDetalleData = {
  id: string;
  problematica_identificada: string | null;
  causa_probable: string | null;
  nivel_certeza: string | null;
  categoria_caso: string | null;
  solucion_recomendada: string | null;
  producto_recomendado: string | null;
  proceso_sugerido: string | null;
  observaciones_tecnicas: string | null;
  requiere_validacion: boolean;
  requiere_validacion_manual?: boolean;
  requiere_validacion_derivada?: boolean;
  motivo_validacion?: string[];
  motivos_validacion?: string[];
  validacion_pendiente?: boolean;
  validacion_resuelta?: boolean;
  resultado_validacion?: string | null;
  validado_por?: string | null;
  observacion_validacion?: string | null;
  fecha_validacion: string | null;
  created_at: string | null;
} | null;

export type DiagnosticoAgenteDetalleData = {
  id: number | string;
  resumen_del_caso: string | null;
  sintomas_clave: string[] | null;
  categoria_probable: string | null;
  causa_probable: string | null;
  causas_alternativas: string[] | null;
  nivel_certeza: string | null;
  solucion_recomendada: string | null;
  producto_recomendado: string | null;
  proceso_sugerido: string | null;
  observaciones_tecnicas: string | null;
  riesgos_o_advertencias: string[] | null;
  requiere_validacion: boolean | null;
  requiere_escalamiento: boolean | null;
  estado_caso: string | null;
  caso_listo_para_cotizacion: boolean | null;
  estado_comercial: string | null;
  proximo_paso: string | null;
  suficiencia_de_evidencia: string | null;
  riesgo_de_error: string | null;
  coincidencia_con_patron: string | null;
  necesidad_de_revision_humana: string | null;
  fuente_agente: string | null;
  version_prompt: string | null;
  version_modelo: string | null;
  created_at: string;
} | null;

export type CotizacionDetalleData = {
  id: string;
  fecha_cotizacion: string | null;
  solucion_asociada: string | null;
  productos_incluidos: string | null;
  cantidades: string | null;
  condiciones: string | null;
  observaciones: string | null;
  monto: number | null;
  estado: string | null;
  created_at: string | null;
} | null;

export type SeguimientoDetalleData = {
  id: string;
  fecha: string;
  tipo_seguimiento: string | null;
  resultado: string | null;
  proximo_paso: string | null;
  proxima_fecha: string | null;
  estado_comercial: string | null;
  senales_comerciales: string[];
  observaciones_cliente: string | null;
  created_at: string | null;
} | null;

export type LogisticaDetalleData = {
  id: string;
  fecha_programada: string | null;
  responsable: string | null;
  estado_logistico: string | null;
  observacion_logistica: string | null;
  confirmacion_entrega: boolean | null;
  fecha_entrega: string | null;
  created_at: string | null;
} | null;

export type AuditoriaDetalleData = {
  id: string;
  caso_id: string;
  fecha_auditoria: string | null;
  responsable_auditoria?: string | null;
  estado_auditoria?: AuditoriaEstado | null;
  observaciones_auditoria?: string | null;
  conformidad_cliente?: boolean | null;
  requiere_correccion?: boolean | null;
  fecha_cierre_tecnico?: string | null;
  created_at?: string | null;
} | null;

export type PostventaDetalleData = {
  id: string;
  caso_id: string;
  fecha_postventa: string | null;
  estado_postventa?: PostventaEstado | null;
  observacion_postventa?: string | null;
  requiere_accion?: boolean | null;
  proxima_accion?: string | null;
  proxima_fecha?: string | null;
  conformidad_final?: boolean | null;
  responsable_postventa?: string | null;
  notas?: string | null;
  created_at?: string | null;
} | null;

export type CierreTecnicoDetalleData = {
  id: string;
  caso_id: string;
  fecha_cierre_tecnico: string | null;
  responsable_cierre?: string | null;
  motivo_cierre?: string | null;
  observacion_cierre?: string | null;
  postventa_resuelta?: boolean | null;
  requiere_postventa_adicional?: boolean | null;
  created_at?: string | null;
} | null;

export type EstadoVisualModulo = {
  tipo: EstadoVisualModuloTipo;
  label: string;
  descripcion: string | null;
};

export type ModuloDetalle<TData> = {
  estado: EstadoExpediente;
  label: string;
  visual: EstadoVisualModulo;
  resumen: string | null;
  conteo: number;
  data: TData;
};

export type ResumenExpedienteDetalle = {
  estado: EstadoResumenExpediente;
  label: string;
  descripcion: string;
  modulos_clave_registrados: number;
  modulos_clave_totales: number;
  porcentaje: number;
  faltantes: string[];
};

export type SintesisExpedienteDetalle = {
  cobertura: string;
  modulos_formales_registrados: number;
  modulos_formales_totales: number;
  pendiente_principal: string | null;
  pendiente_principal_label: string;
  pendiente_principal_tab:
    | "informe"
    | "evidencia"
    | "diagnostico_humano"
    | "cotizacion"
    | "seguimiento"
    | "logistica"
    | "postventa"
    | null;
  asistencia_relacionada: string;
};

export type WarningEstructuralDetalle = {
  code: string;
  family: FamiliaAlertaDetalle;
  severity: SeveridadWarningEstructural;
  title: string;
  message: string;
  suggestion: string;
};

export type AlineacionOperativaDetalle = {
  estado: EstadoAlineacionOperativa;
  label: string;
  mensaje: string;
  sugerencia_correccion: string;
  warning: WarningEstructuralDetalle | null;
};

export type SintesisRelacionalDetalle = {
  estado: EstadoRelacionalGeneral;
  label: string;
  descripcion: string;
};

export type CasoDetalleInput = {
  caso: CasoInput;
  host: {
    estado_raw: string;
    descripcion_inicial: string | null;
    canal_entrada: string | null;
    tipo_solicitud: string | null;
    responsable_actual: string | null;
    responsable_humano_id?: string | null;
    responsable_humano_nombre?: string | null;
    responsable_humano_asignado_por?: string | null;
    responsable_humano_asignado_at?: string | null;
    creado_por: string | null;
    diagnostico_por: string | null;
    cotizacion_por: string | null;
    seguimiento_por: string | null;
    cliente_id: string | null;
    cliente_nombre: string | null;
    cliente_empresa: string | null;
  };
  informe: InformeDetalleData;
  evidencias: EvidenciaDetalleData;
  diagnostico: DiagnosticoDetalleData;
  diagnosticoAgente: DiagnosticoAgenteDetalleData;
  cotizacion: CotizacionDetalleData;
  seguimiento: SeguimientoDetalleData;
  logistica?: LogisticaDetalleData;
  auditoria: AuditoriaDetalleData;
  postventa: PostventaDetalleData;
  cierreTecnico: CierreTecnicoDetalleData;
  bitacora: CambioBitacoraDetalle[];
};

export type CasoDetalleNormalizado = {
  resumen: {
    id: string;
    cliente_id: string | null;
    cliente_nombre: string | null;
    cliente_contexto: string | null;
    tipo_solicitud: string | null;
    canal: string | null;
    prioridad: string | null;
    descripcion_inicial: string | null;
  };
  estadoGlobal: CasoNormalizado & {
    macroarea_actual_label: string;
    macroarea_siguiente_label: string | null;
    salud: {
      nivel: "rojo" | "amarillo" | "verde";
      titulo: string;
      descripcion: string;
    };
    alineacion_operativa: AlineacionOperativaDetalle;
    priorizacion_operativa_agente: AgentePriorizacionOutput;
    progreso: {
      etapa_actual: string;
      etapa_actual_label: string;
      porcentaje: number;
    };
  };
  estadosInternos: {
    tecnico_estado: string | null;
    comercial_estado: string | null;
    estado_raw: string;
  };
  relacional: {
    sintesis: SintesisRelacionalDetalle;
    confianza: string | null;
    friccion: string | null;
    desgaste_operativo: string | null;
    claridad_intencion: string | null;
    conversion: string | null;
    lectura_aplicada: string | null;
  };
  trazabilidad: {
    sintesis: SintesisTrazabilidadDetalle;
    alertas: AlertaDetalle[];
    alertas_agrupadas: GrupoAlertasDetalle[];
    historial_operativo: CambioBitacoraDetalle[];
    timeline: TimelineDetalle[];
  };
  ownership: {
    responsable_actual: string | null;
    responsable_humano_id: string | null;
    responsable_humano: string | null;
    responsable_humano_label: string;
    responsable_humano_asignado_por: string | null;
    responsable_humano_asignado_at: string | null;
    agente_ia_activo: ResponsabilidadOperativaCaso["agente_ia_activo"];
    agente_operativo_activo: ResponsabilidadOperativaCaso["agente_operativo_activo"];
    creado_por: string | null;
    diagnostico_por: string | null;
    cotizacion_por: string | null;
    seguimiento_por: string | null;
    activos: OwnershipActivoDetalle[];
    resumen: OwnershipResumenDetalle;
  };
  expediente: {
    resumen: ResumenExpedienteDetalle;
    sintesis: SintesisExpedienteDetalle;
    informe: ModuloDetalle<InformeDetalleData>;
    evidencia: ModuloDetalle<EvidenciaDetalleData>;
    diagnostico_humano: ModuloDetalle<DiagnosticoDetalleData>;
    agente_ia: ModuloDetalle<DiagnosticoAgenteDetalleData>;
    cotizacion: ModuloDetalle<CotizacionDetalleData>;
    seguimiento: ModuloDetalle<SeguimientoDetalleData>;
    logistica: ModuloDetalle<LogisticaDetalleData>;
    postventa: ModuloDetalle<PostventaDetalleData>;
  };
  navegacion: {
    accion_sugerida: {
      href: string;
      label: string;
    };
  };
  metadata: {
    origen: string;
    timestamp: string;
  };
};
