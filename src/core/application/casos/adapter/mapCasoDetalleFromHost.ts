import type { CasoInput } from "@/core/domain/casos";
import type {
  AuditoriaDetalleData,
  CambioBitacoraDetalle,
  CasoDetalleInput,
  CierreTecnicoDetalleData,
  CotizacionDetalleData,
  DiagnosticoAgenteDetalleData,
  DiagnosticoDetalleData,
  EvidenciaDetalleData,
  InformeDetalleData,
  LogisticaDetalleData,
  PostventaDetalleData,
  SeguimientoDetalleData,
} from "@/core/domain/casos/detalle";
import type {
  AuditoriaEstado,
  PostventaEstado,
} from "@/lib/domain/casos/types";
import { derivarEstadoValidacionDiagnostico } from "@/core/domain/casos/rules";
import { mapCasoFromHost } from "./mapCasoFromHost";
import type {
  HostCasoBaseRecord,
  HostCierreTecnicoRecord,
  HostCotizacionRecord,
  HostDiagnosticoRecord,
  HostInformeRecord,
  HostLogisticaRecord,
  HostPostventaRecord,
  HostSeguimientoRecord,
  HostWorkflowTransitionRecord,
} from "./mapCasoFromHost";

export type HostCasoDetalleRecord = HostCasoBaseRecord & {
  estado: string;
  descripcion_inicial: string | null;
  canal_entrada: string | null;
  responsable_actual: string | null;
  responsable_humano_id?: string | null;
  responsable_humano_nombre?: string | null;
  responsable_humano_asignado_por?: string | null;
  responsable_humano_asignado_at?: string | null;
  creado_por: string | null;
  diagnostico_por: string | null;
  cotizacion_por: string | null;
  seguimiento_por: string | null;
};

export type HostInformeDetalleRecord = HostInformeRecord & {
  fecha_recepcion: string | null;
  resumen_tecnico: string | null;
  hallazgos_principales: string | null;
  estado_revision: string | null;
};

export type HostDiagnosticoDetalleRecord = HostDiagnosticoRecord & {
  problematica_identificada: string | null;
  causa_probable: string | null;
  nivel_certeza: string | null;
  categoria_caso: string | null;
  solucion_recomendada: string | null;
  producto_recomendado: string | null;
  proceso_sugerido: string | null;
  observaciones_tecnicas: string | null;
  fecha_validacion: string | null;
  validado_por: string | null;
  resultado_validacion: string | null;
  observacion_validacion: string | null;
};

export type HostCotizacionDetalleRecord = HostCotizacionRecord & {
  fecha_cotizacion: string | null;
  solucion_asociada: string | null;
  productos_incluidos: string | null;
  cantidades: string | null;
  condiciones: string | null;
  observaciones: string | null;
  monto: number | null;
};

export type HostSeguimientoDetalleRecord = HostSeguimientoRecord & {
  fecha: string;
  tipo_seguimiento: string | null;
  resultado: string | null;
  observaciones_cliente: string | null;
};

export type HostLogisticaDetalleRecord = HostLogisticaRecord;
export type HostPostventaDetalleRecord = HostPostventaRecord;
export type HostCierreTecnicoDetalleRecord = HostCierreTecnicoRecord;

export type HostAuditoriaDetalleRecord = {
  id: string;
  caso_id: string;
  fecha_auditoria: string | null;
  responsable_auditoria?: string | null;
  estado_auditoria?: string | null;
  observaciones_auditoria?: string | null;
  conformidad_cliente?: boolean | null;
  requiere_correccion?: boolean | null;
  fecha_cierre_tecnico?: string | null;
  created_at?: string | null;
};

export type HostDiagnosticoAgenteDetalleRecord = NonNullable<
  DiagnosticoAgenteDetalleData
>;

export type HostEvidenciaDetalleRecord = EvidenciaDetalleData[number];

export type HostCambioBitacoraDetalleRecord = CambioBitacoraDetalle;

function textoONull(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio || null;
}

function normalizarAuditoriaEstado(
  valor: string | null | undefined
): AuditoriaEstado | null {
  const normalizado = textoONull(valor);
  if (
    normalizado === "pendiente" ||
    normalizado === "en_revision" ||
    normalizado === "conforme" ||
    normalizado === "con_observaciones" ||
    normalizado === "requiere_correccion" ||
    normalizado === "cerrada"
  ) {
    return normalizado;
  }

  return null;
}

function normalizarPostventaEstado(
  valor: string | null | undefined
): PostventaEstado | null {
  const normalizado = textoONull(valor);
  if (
    normalizado === "abierta" ||
    normalizado === "en_seguimiento" ||
    normalizado === "requiere_accion" ||
    normalizado === "resuelta" ||
    normalizado === "cerrada"
  ) {
    return normalizado;
  }

  return null;
}

function toAuditoriaData(
  auditoria: HostAuditoriaDetalleRecord | null | undefined
): AuditoriaDetalleData {
  if (!auditoria) return null;

  return {
    id: auditoria.id,
    caso_id: auditoria.caso_id,
    fecha_auditoria: auditoria.fecha_auditoria,
    responsable_auditoria: textoONull(auditoria.responsable_auditoria),
    estado_auditoria: normalizarAuditoriaEstado(auditoria.estado_auditoria),
    observaciones_auditoria: textoONull(auditoria.observaciones_auditoria),
    conformidad_cliente: auditoria.conformidad_cliente ?? null,
    requiere_correccion: auditoria.requiere_correccion ?? null,
    fecha_cierre_tecnico: auditoria.fecha_cierre_tecnico ?? null,
    created_at: auditoria.created_at ?? null,
  };
}

function toPostventaData(
  postventa: HostPostventaRecord | null | undefined
): PostventaDetalleData {
  if (!postventa) return null;

  return {
    id: postventa.id,
    caso_id: postventa.caso_id,
    fecha_postventa: postventa.fecha_postventa,
    estado_postventa: normalizarPostventaEstado(postventa.estado_postventa),
    observacion_postventa: textoONull(postventa.observacion_postventa),
    requiere_accion: postventa.requiere_accion ?? null,
    proxima_accion: textoONull(postventa.proxima_accion),
    proxima_fecha: postventa.proxima_fecha ?? null,
    conformidad_final: postventa.conformidad_final ?? null,
    responsable_postventa: textoONull(postventa.responsable_postventa),
    notas: textoONull(postventa.notas),
    created_at: postventa.created_at ?? null,
  };
}

function toCierreTecnicoData(
  cierreTecnico: HostCierreTecnicoRecord | null | undefined
): CierreTecnicoDetalleData {
  if (!cierreTecnico) return null;

  return {
    id: cierreTecnico.id,
    caso_id: cierreTecnico.caso_id,
    fecha_cierre_tecnico: cierreTecnico.fecha_cierre_tecnico,
    responsable_cierre: textoONull(cierreTecnico.responsable_cierre),
    motivo_cierre: textoONull(cierreTecnico.motivo_cierre),
    observacion_cierre: textoONull(cierreTecnico.observacion_cierre),
    postventa_resuelta: cierreTecnico.postventa_resuelta ?? null,
    requiere_postventa_adicional:
      cierreTecnico.requiere_postventa_adicional ?? null,
    created_at: cierreTecnico.created_at ?? null,
  };
}

export type HostCasoDetalleReadModel = {
  caso: HostCasoDetalleRecord;
  informe: HostInformeDetalleRecord | null;
  diagnostico: HostDiagnosticoDetalleRecord | null;
  cotizacion: HostCotizacionDetalleRecord | null;
  seguimiento: HostSeguimientoDetalleRecord | null;
  logistica?: HostLogisticaDetalleRecord | null;
  auditoria?: HostAuditoriaDetalleRecord | null;
  postventa?: HostPostventaRecord | null;
  cierreTecnico?: HostCierreTecnicoRecord | null;
  workflowTransitions: HostWorkflowTransitionRecord[];
  diagnosticoAgente: HostDiagnosticoAgenteDetalleRecord | null;
  evidencias: HostEvidenciaDetalleRecord[];
  bitacora: HostCambioBitacoraDetalleRecord[];
  origen?: string;
  timestamp?: string;
};

function toInformeData(
  informe: HostInformeDetalleRecord | null
): InformeDetalleData {
  if (!informe) return null;
  return {
    id: informe.id,
    fecha_recepcion: informe.fecha_recepcion,
    resumen_tecnico: informe.resumen_tecnico,
    hallazgos_principales: informe.hallazgos_principales,
    estado_revision: informe.estado_revision,
    created_at: informe.created_at ?? null,
  };
}

function toDiagnosticoData(
  diagnostico: HostDiagnosticoDetalleRecord | null,
  informe: HostInformeDetalleRecord | null,
  diagnosticoAgente: HostDiagnosticoAgenteDetalleRecord | null
): DiagnosticoDetalleData {
  if (!diagnostico) return null;

  const validacionDiagnostico = derivarEstadoValidacionDiagnostico({
    tieneDiagnostico: true,
    requiereValidacionManual: diagnostico.requiere_validacion,
    tieneInformeTecnico: !!informe,
    nivelCerteza: diagnostico.nivel_certeza,
    problematicaIdentificada: diagnostico.problematica_identificada,
    causaProbable: diagnostico.causa_probable,
    categoriaCaso: diagnostico.categoria_caso,
    solucionRecomendada: diagnostico.solucion_recomendada,
    categoriaProbableAgente: diagnosticoAgente?.categoria_probable,
    resultadoValidacion: diagnostico.resultado_validacion,
    validadoPor: diagnostico.validado_por,
    fechaValidacion: diagnostico.fecha_validacion,
    observacionValidacion: diagnostico.observacion_validacion,
  });

  return {
    id: diagnostico.id,
    problematica_identificada: diagnostico.problematica_identificada,
    causa_probable: diagnostico.causa_probable,
    nivel_certeza: diagnostico.nivel_certeza,
    categoria_caso: diagnostico.categoria_caso,
    solucion_recomendada: diagnostico.solucion_recomendada,
    producto_recomendado: diagnostico.producto_recomendado,
    proceso_sugerido: diagnostico.proceso_sugerido,
    observaciones_tecnicas: diagnostico.observaciones_tecnicas,
    requiere_validacion: validacionDiagnostico.requiere_validacion_final,
    requiere_validacion_manual:
      validacionDiagnostico.requiere_validacion_manual,
    requiere_validacion_derivada:
      validacionDiagnostico.requiere_validacion_derivada,
    motivo_validacion: validacionDiagnostico.motivo_validacion,
    motivos_validacion: validacionDiagnostico.motivos_validacion,
    validacion_pendiente: validacionDiagnostico.validacion_pendiente,
    validacion_resuelta: validacionDiagnostico.validacion_resuelta,
    resultado_validacion: validacionDiagnostico.resultado_validacion,
    validado_por: validacionDiagnostico.validado_por,
    observacion_validacion: validacionDiagnostico.observacion_validacion,
    fecha_validacion: diagnostico.fecha_validacion,
    created_at: diagnostico.created_at ?? null,
  };
}

function toCotizacionData(
  cotizacion: HostCotizacionDetalleRecord | null
): CotizacionDetalleData {
  if (!cotizacion) return null;
  return {
    id: cotizacion.id,
    fecha_cotizacion: cotizacion.fecha_cotizacion,
    solucion_asociada: cotizacion.solucion_asociada,
    productos_incluidos: cotizacion.productos_incluidos,
    cantidades: cotizacion.cantidades,
    condiciones: cotizacion.condiciones,
    observaciones: cotizacion.observaciones,
    monto: cotizacion.monto,
    estado: cotizacion.estado,
    created_at: cotizacion.created_at ?? null,
  };
}

function toSeguimientoData(
  seguimiento: HostSeguimientoDetalleRecord | null
): SeguimientoDetalleData {
  if (!seguimiento) return null;
  return {
    id: seguimiento.id,
    fecha: seguimiento.fecha,
    tipo_seguimiento: seguimiento.tipo_seguimiento,
    resultado: seguimiento.resultado,
    proximo_paso: seguimiento.proximo_paso,
    proxima_fecha: seguimiento.proxima_fecha,
    estado_comercial: seguimiento.estado_comercial,
    senales_comerciales: seguimiento.senales_comerciales ?? [],
    observaciones_cliente: seguimiento.observaciones_cliente,
    created_at: seguimiento.created_at ?? null,
  };
}

function toLogisticaData(
  logistica: HostLogisticaDetalleRecord | null
): LogisticaDetalleData {
  if (!logistica) return null;
  return {
    id: logistica.id,
    fecha_programada: logistica.fecha_programada,
    responsable: logistica.responsable,
    estado_logistico: logistica.estado_logistico,
    observacion_logistica: logistica.observacion_logistica,
    confirmacion_entrega: logistica.confirmacion_entrega,
    fecha_entrega: logistica.fecha_entrega,
    created_at: logistica.created_at ?? null,
  };
}

export function mapCasoDetalleFromHost(
  host: HostCasoDetalleReadModel
): CasoDetalleInput {
  const caso: CasoInput = mapCasoFromHost({
    caso: host.caso,
    informe: host.informe,
    diagnostico: host.diagnostico,
    cotizacion: host.cotizacion,
    seguimiento: host.seguimiento,
    logistica: host.logistica,
    auditoria: host.auditoria,
    postventa: host.postventa,
    cierreTecnico: host.cierreTecnico,
    workflowTransitions: host.workflowTransitions,
    origen: host.origen ?? "supabase.casos.detalle",
    timestamp: host.timestamp,
  });

  const cliente =
    Array.isArray(host.caso.clientes)
      ? (host.caso.clientes[0] ?? null)
      : host.caso.clientes;

  return {
    caso,
    host: {
      estado_raw: host.caso.estado,
      descripcion_inicial: host.caso.descripcion_inicial,
      canal_entrada: host.caso.canal_entrada,
      tipo_solicitud: host.caso.tipo_solicitud,
      responsable_actual: host.caso.responsable_actual,
      responsable_humano_id: host.caso.responsable_humano_id ?? null,
      responsable_humano_nombre: host.caso.responsable_humano_nombre ?? null,
      responsable_humano_asignado_por:
        host.caso.responsable_humano_asignado_por ?? null,
      responsable_humano_asignado_at:
        host.caso.responsable_humano_asignado_at ?? null,
      creado_por: host.caso.creado_por,
      diagnostico_por: host.caso.diagnostico_por,
      cotizacion_por: host.caso.cotizacion_por,
      seguimiento_por: host.caso.seguimiento_por,
      cliente_id: cliente?.id ?? host.caso.cliente_id ?? null,
      cliente_nombre: cliente?.nombre ?? null,
      cliente_empresa: cliente?.empresa ?? null,
    },
    informe: toInformeData(host.informe),
    evidencias: host.evidencias,
    diagnostico: toDiagnosticoData(
      host.diagnostico,
      host.informe,
      host.diagnosticoAgente
    ),
    diagnosticoAgente: host.diagnosticoAgente,
    cotizacion: toCotizacionData(host.cotizacion),
    seguimiento: toSeguimientoData(host.seguimiento),
    logistica: toLogisticaData(host.logistica ?? null),
    auditoria: toAuditoriaData(host.auditoria),
    postventa: toPostventaData(host.postventa),
    cierreTecnico: toCierreTecnicoData(host.cierreTecnico),
    bitacora: host.bitacora,
  };
}
