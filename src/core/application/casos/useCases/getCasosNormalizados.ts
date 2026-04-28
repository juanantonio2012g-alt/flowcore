import type { CasoNormalizado } from "@/core/domain/casos";
import { normalizarCaso } from "@/core/domain/casos";
import type {
  CasoWorklistItem,
  CasosBulkUpdateItem,
  CasosWorklistMeta,
  GetCasosNormalizadosResult,
} from "../contracts";
import { mapCasoFromHost } from "../adapter/mapCasoFromHost";
import type {
  HostCasoBaseRecord,
  HostCotizacionRecord,
  HostDiagnosticoRecord,
  HostInformeRecord,
  HostLogisticaRecord,
  HostSeguimientoRecord,
  HostWorkflowTransitionRecord,
} from "../adapter/mapCasoFromHost";
import {
  completarListaValidacionDiagnosticoCompat,
  esErrorEsquemaValidacionDiagnosticoFaltante,
} from "../adapter/diagnosticoValidacionCompat";
import {
  completarListaSeguimientoComercialCompat,
  esErrorEsquemaSeguimientoComercialFaltante,
} from "../adapter/seguimientoComercialCompat";
import { esErrorEsquemaWorkflowTransitionsFaltante } from "../adapter/workflowTransitionsCompat";
import { esErrorEsquemaLogisticaFaltante } from "../adapter/logisticaCompat";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listarCasosLocalesDeDesarrollo } from "@/lib/dev/casos-local-store";
import {
  construirMensajeErrorConectividadSupabase,
  esErrorConectividadSupabase,
} from "@/lib/supabase/errors";
import { derivarResponsabilidadOperativa } from "@/core/domain/casos/responsabilidad-operativa";

function esErrorSupabaseTransitorio(error: unknown) {
  return esErrorConectividadSupabase(error);
}

async function esperar(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type SupabaseQueryLikeResult<TData = unknown> = {
  data: TData | null;
  error: { message?: string | null } | null;
};

type Awaitable<T> = PromiseLike<T> | T;

async function queryWithSupabaseRetry<TData, TResult extends SupabaseQueryLikeResult<TData>>(
  operation: () => Awaitable<TResult>,
  attempts = 3
): Promise<TResult> {
  let lastResult: TResult | null = null;
  let lastThrownError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation();
      lastResult = result;

      if (!result.error || !esErrorSupabaseTransitorio(result.error) || attempt === attempts) {
        return result;
      }

      if (attempt < attempts) {
        await esperar(150 * attempt);
      }
    } catch (error) {
      lastThrownError = error;

      if (!esErrorSupabaseTransitorio(error) || attempt === attempts) {
        throw error;
      }

      await esperar(150 * attempt);
    }
  }

  if (lastResult) {
    return lastResult;
  }

  if (lastThrownError) {
    throw lastThrownError;
  }

  throw new Error("No se pudo completar la consulta a Supabase.");
}

async function getDiagnosticosByCasoIds(
  casoIds: string[]
): Promise<HostDiagnosticoRecord[]> {
  const supabase = createServerSupabaseClient();
  const selectBase = `
    id,
    caso_id,
    problematica_identificada,
    causa_probable,
    nivel_certeza,
    categoria_caso,
    solucion_recomendada,
    requiere_validacion,
    fecha_validacion,
    created_at
  `;
  const { data, error } = await queryWithSupabaseRetry(() =>
    supabase
      .from("diagnosticos")
      .select(`
        ${selectBase},
        validado_por,
        resultado_validacion,
        observacion_validacion
      `)
      .in("caso_id", casoIds)
      .order("created_at", { ascending: false })
  );

  if (error && esErrorEsquemaValidacionDiagnosticoFaltante(error)) {
    const legacyResult = await queryWithSupabaseRetry(() =>
      supabase
        .from("diagnosticos")
        .select(selectBase)
        .in("caso_id", casoIds)
        .order("created_at", { ascending: false })
    );

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return completarListaValidacionDiagnosticoCompat(
      (legacyResult.data as Array<
        Omit<
          HostDiagnosticoRecord,
          "validado_por" | "resultado_validacion" | "observacion_validacion"
        >
      > | null) ?? []
    ) as HostDiagnosticoRecord[];
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostDiagnosticoRecord[] | null) ?? [];
}

async function getSeguimientosByCasoIds(
  casoIds: string[]
): Promise<HostSeguimientoRecord[]> {
  const supabase = createServerSupabaseClient();
  const selectBase = `
    id,
    caso_id,
    estado_comercial,
    proximo_paso,
    proxima_fecha,
    created_at
  `;
  const { data, error } = await queryWithSupabaseRetry(() =>
    supabase
      .from("seguimientos")
      .select(`
        ${selectBase},
        senales_comerciales
      `)
      .in("caso_id", casoIds)
      .order("created_at", { ascending: false })
  );

  if (error && esErrorEsquemaSeguimientoComercialFaltante(error)) {
    const legacyResult = await queryWithSupabaseRetry(() =>
      supabase
        .from("seguimientos")
        .select(selectBase)
        .in("caso_id", casoIds)
        .order("created_at", { ascending: false })
    );

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return completarListaSeguimientoComercialCompat(
      (legacyResult.data as Array<
        Omit<HostSeguimientoRecord, "senales_comerciales">
      > | null) ?? []
    ) as HostSeguimientoRecord[];
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostSeguimientoRecord[] | null) ?? [];
}

function indexarUltimoPorCaso<
  T extends { caso_id: string; created_at?: string | null }
>(items: T[]) {
  const mapa = new Map<string, T>();

  for (const item of items) {
    if (!mapa.has(item.caso_id)) {
      mapa.set(item.caso_id, item);
    }
  }

  return mapa;
}

function agruparPorCaso<T extends { caso_id: string }>(items: T[]) {
  const mapa = new Map<string, T[]>();

  for (const item of items) {
    const actuales = mapa.get(item.caso_id) ?? [];
    actuales.push(item);
    mapa.set(item.caso_id, actuales);
  }

  return mapa;
}

function esErrorCamposAsignacionHumanaFaltantes(error: unknown) {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  return (
    message.includes("responsable_humano_id") ||
    message.includes("responsable_humano_nombre") ||
    message.includes("responsable_humano_asignado_por") ||
    message.includes("responsable_humano_asignado_at")
  );
}

function proyectarCasoWorklist(
  caso: CasoNormalizado,
  asignacion?: {
    responsableActualRaw?: string | null;
    responsableHumanoId?: string | null;
    responsableHumanoNombre?: string | null;
    responsableHumanoAsignadoPor?: string | null;
    responsableHumanoAsignadoAt?: string | null;
  }
): CasoWorklistItem {
  const responsabilidad = derivarResponsabilidadOperativa({
    macroareaActual: caso.macroarea_actual,
    macroareaLabel: caso.macroarea_label,
    responsableActual: asignacion?.responsableActualRaw,
    responsableHumanoId: asignacion?.responsableHumanoId,
    responsableHumanoNombre: asignacion?.responsableHumanoNombre,
    responsableHumanoAsignadoPor: asignacion?.responsableHumanoAsignadoPor,
    responsableHumanoAsignadoAt: asignacion?.responsableHumanoAsignadoAt,
  });

  return {
    id: caso.id,
    cliente_id: caso.metadata.cliente_id,
    cliente: caso.metadata.cliente,
    proyecto: caso.metadata.empresa,
    created_at: caso.metadata.created_at,
    prioridad: caso.metadata.prioridad,
    estado: caso.estado,
    estado_label: caso.estado_label,
    estado_tecnico_real: caso.metadata.estado_tecnico_real,
    estado_comercial_real: caso.metadata.estado_comercial_real,
    proxima_accion_real: caso.proxima_accion,
    proxima_fecha_real: caso.proxima_fecha,
    riesgo: caso.riesgo,
    sla: caso.sla.etiqueta,
    requiere_validacion:
      caso.metadata.validacion_pendiente ?? caso.metadata.requiere_validacion,
    validacion_pendiente: caso.metadata.validacion_pendiente,
    validacion_resuelta: caso.metadata.validacion_resuelta,
    resultado_validacion: caso.metadata.resultado_validacion,
    recomendacion_accion: caso.recomendacion_operativa.accion,
    recomendacion_urgencia: caso.recomendacion_operativa.urgencia,
    recomendacion_motivo: caso.recomendacion_operativa.motivo,
    recomendacion_fecha: caso.recomendacion_operativa.fecha_sugerida,
    workflow_etapa_actual: caso.workflow.etapa_actual,
    workflow_estado: caso.workflow.estado_workflow,
    workflow_continuidad_estado: caso.workflow.continuidad.estado,
    workflow_continuidad_origen: caso.workflow.continuidad.origen,
    workflow_alineacion_expediente:
      caso.workflow.alineacion.expediente_vs_workflow,
    workflow_alineacion_continuidad:
      caso.workflow.alineacion.continuidad_vs_workflow,
    workflow_alineacion_sla: caso.workflow.alineacion.sla_vs_workflow,
    workflow_alertas: caso.workflow.alineacion.alertas,
    workflow_ultima_transicion_at: caso.workflow.metadata.ultima_transicion_at,
    workflow_transicion_actual: caso.workflow.transiciones.actual?.label ?? null,
    workflow_transicion_estado:
      caso.workflow.transiciones.actual?.estado ?? null,
    workflow_transicion_destino:
      caso.workflow.transiciones.actual?.destino ?? null,
    workflow_transicion_bloqueos:
      caso.workflow.transiciones.actual?.bloqueos ?? [],
    macroarea_actual: caso.macroarea_actual,
    macroarea_siguiente: caso.macroarea_siguiente,
    macroarea_label: caso.macroarea_label,
    macroarea_orden: caso.macroarea_orden,
    macroarea_motivo: caso.metadata.macroarea_motivo,
    responsable_actual_raw: responsabilidad.responsable_actual_raw,
    responsable_humano_id: responsabilidad.responsable_humano_id,
    responsable_humano: responsabilidad.responsable_humano,
    responsable_humano_label: responsabilidad.responsable_humano_label,
    responsable_humano_asignado_por:
      responsabilidad.responsable_humano_asignado_por,
    responsable_humano_asignado_at:
      responsabilidad.responsable_humano_asignado_at,
    agente_ia_activo: responsabilidad.agente_ia_activo,
    agente_operativo_activo: responsabilidad.agente_operativo_activo,
    nivel_confianza_cliente: caso.metadata.nivel_confianza_cliente,
    nivel_friccion_cliente: caso.metadata.nivel_friccion_cliente,
    desgaste_operativo: caso.metadata.desgaste_operativo,
    claridad_intencion: caso.metadata.claridad_intencion,
    probabilidad_conversion: caso.metadata.probabilidad_conversion,
    observacion_relacional: caso.metadata.observacion_relacional,
  };
}

function ordenarWorklist(items: CasoWorklistItem[]) {
  const pesoPrioridad = { urgente: 2, alta: 1, media: 0, baja: 0 };
  const pesoContinuidad = {
    vencida: 3,
    desfasada: 2,
    pendiente: 2,
    bloqueada: 2,
    en_espera: 1,
    cerrada: 0,
    al_dia: 0,
    alineada: 0,
  } as const;

  const score = (item: CasoWorklistItem) => {
    let total = 0;
    if (item.validacion_pendiente && item.riesgo === "alto") total += 500;
    else if (item.riesgo === "alto") total += 400;
    total +=
      (pesoContinuidad[
        (item.workflow_alineacion_continuidad ??
          item.workflow_continuidad_estado ??
          "alineada") as keyof typeof pesoContinuidad
      ] ?? 0) * 120;
    if (!item.proxima_fecha_real) total += 180;
    if (
      !item.proxima_accion_real ||
      item.proxima_accion_real === "Sin próxima acción"
    ) {
      total += 150;
    }
    total +=
      (pesoPrioridad[item.prioridad as keyof typeof pesoPrioridad] ?? 0) * 100;
    if (item.riesgo === "medio") total += 50;
    if (item.workflow_alineacion_sla === "inconsistente") total += 120;
    return total;
  };

  return [...items].sort((a, b) => {
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;

    const fechaA = a.proxima_fecha_real
      ? new Date(a.proxima_fecha_real).getTime()
      : Number.MAX_SAFE_INTEGER;
    const fechaB = b.proxima_fecha_real
      ? new Date(b.proxima_fecha_real).getTime()
      : Number.MAX_SAFE_INTEGER;
    return fechaA - fechaB;
  });
}

function construirMeta(items: CasoWorklistItem[]): CasosWorklistMeta {
  return {
    total: items.length,
    riesgo_alto: items.filter((item) => item.riesgo === "alto").length,
    sin_proxima_fecha: items.filter(
      (item) =>
        !item.proxima_fecha_real &&
        item.workflow_continuidad_estado !== "en_espera"
    ).length,
    sin_proxima_accion: items.filter(
      (item) =>
        !item.proxima_accion_real ||
        item.proxima_accion_real === "Sin próxima acción"
    ).length,
    validacion_pendiente: items.filter((item) => item.validacion_pendiente)
      .length,
    orden_default_aplicado: "worklist_operativa",
  };
}

function construirBulkItems(items: CasoWorklistItem[]): CasosBulkUpdateItem[] {
  return items.map((item) => ({
    id: item.id,
    cliente: item.cliente,
    proyecto: item.proyecto,
    riesgo: item.riesgo,
    estado_comercial_real: item.estado_comercial_real,
    proxima_fecha_real: item.proxima_fecha_real,
    recomendacion_accion: item.recomendacion_accion,
    recomendacion_urgencia: item.recomendacion_urgencia,
    recomendacion_fecha: item.recomendacion_fecha,
  }));
}

function resultadoVacio(): GetCasosNormalizadosResult {
  return {
    items: [],
    meta: {
      total: 0,
      riesgo_alto: 0,
      sin_proxima_fecha: 0,
      sin_proxima_accion: 0,
      validacion_pendiente: 0,
      orden_default_aplicado: "worklist_operativa",
    },
    bulk_items: [],
  };
}

const CASOS_SELECT_BASE = `
  id,
  prioridad,
  created_at,
  estado_tecnico,
  estado_comercial,
  proxima_accion,
  proxima_fecha,
  tipo_solicitud,
  nivel_confianza_cliente,
  nivel_friccion_cliente,
  desgaste_operativo,
  claridad_intencion,
  probabilidad_conversion,
  observacion_relacional,
  responsable_actual,
  cliente_id,
  clientes (
    id,
    nombre,
    empresa
  )
`;

const CASOS_SELECT_CON_ASIGNACION = `
  ${CASOS_SELECT_BASE},
  responsable_humano_id,
  responsable_humano_nombre,
  responsable_humano_asignado_por,
  responsable_humano_asignado_at
`;

function proyectarCasosHostBase(
  casos: HostCasoBaseRecord[],
  origen: string
) {
  return casos.map((caso) =>
    proyectarCasoWorklist(
      normalizarCaso(
        mapCasoFromHost({
          caso,
          origen,
        })
      ),
      {
        responsableActualRaw: caso.responsable_actual,
        responsableHumanoId: caso.responsable_humano_id,
        responsableHumanoNombre: caso.responsable_humano_nombre,
        responsableHumanoAsignadoPor: caso.responsable_humano_asignado_por,
        responsableHumanoAsignadoAt: caso.responsable_humano_asignado_at,
      }
    )
  );
}

export async function getCasosNormalizados(): Promise<GetCasosNormalizadosResult> {
  const supabase = createServerSupabaseClient();

  try {
    let casosResult: SupabaseQueryLikeResult<unknown> = await queryWithSupabaseRetry(() =>
      supabase
        .from("casos")
        .select(CASOS_SELECT_CON_ASIGNACION)
        .order("created_at", { ascending: false })
    );

    if (
      casosResult.error &&
      esErrorCamposAsignacionHumanaFaltantes(casosResult.error)
    ) {
      casosResult = await queryWithSupabaseRetry(() =>
        supabase
          .from("casos")
          .select(CASOS_SELECT_BASE)
          .order("created_at", { ascending: false })
      );
    }

    const { data: casosData, error: casosError } = casosResult;

    if (casosError && esErrorSupabaseTransitorio(casosError)) {
      const casosLocales = await listarCasosLocalesDeDesarrollo();

      if (casosLocales.length > 0) {
        const items = ordenarWorklist(
          proyectarCasosHostBase(casosLocales, "opencore.dev.local")
        );

        return {
          items,
          meta: construirMeta(items),
          bulk_items: construirBulkItems(items),
        };
      }

      console.warn(
        "casos_normalizados_fallback:",
        construirMensajeErrorConectividadSupabase(
          "la lectura de casos normalizados",
          casosError
        )
      );
      return resultadoVacio();
    }

    if (casosError) {
      throw new Error(casosError.message ?? "No se pudo leer casos.");
    }

    const casos = (casosData ?? []) as HostCasoBaseRecord[];
    const casosLocales = await listarCasosLocalesDeDesarrollo();
    const casoIds = casos.map((caso) => caso.id);

    if (casoIds.length === 0 && casosLocales.length === 0) {
      return resultadoVacio();
    }

    if (casoIds.length === 0) {
      const items = ordenarWorklist(
        proyectarCasosHostBase(casosLocales, "opencore.dev.local")
      );

      return {
        items,
        meta: construirMeta(items),
        bulk_items: construirBulkItems(items),
      };
    }

    const [
      { data: informesData, error: informesError },
      diagnosticosData,
      { data: cotizacionesData, error: cotizacionesError },
      seguimientosData,
      { data: logisticasData, error: logisticasError },
      { data: workflowTransitionsData, error: workflowTransitionsError },
    ] = await Promise.all([
      queryWithSupabaseRetry(() =>
        supabase
          .from("informes_tecnicos")
          .select("id, caso_id, created_at")
          .in("caso_id", casoIds)
          .order("created_at", { ascending: false })
      ),
      getDiagnosticosByCasoIds(casoIds),
      queryWithSupabaseRetry(() =>
        supabase
          .from("cotizaciones")
          .select("id, caso_id, estado, created_at")
          .in("caso_id", casoIds)
          .order("created_at", { ascending: false })
      ),
      getSeguimientosByCasoIds(casoIds),
      queryWithSupabaseRetry(() =>
        supabase
          .from("logisticas_entrega")
          .select(`
            id,
            caso_id,
            fecha_programada,
            responsable,
            estado_logistico,
            observacion_logistica,
            confirmacion_entrega,
            fecha_entrega,
            created_at
          `)
          .in("caso_id", casoIds)
          .order("created_at", { ascending: false })
      ),
      queryWithSupabaseRetry(() =>
        supabase
          .from("workflow_transitions")
          .select(`
            id,
            caso_id,
            transition_code,
            from_stage,
            to_stage,
            status,
            actor,
            origin,
            occurred_at,
            observacion,
            evidencia_ref
          `)
          .in("caso_id", casoIds)
          .order("occurred_at", { ascending: false })
      ),
    ]);

    if (informesError) throw new Error(informesError.message);
    if (cotizacionesError) throw new Error(cotizacionesError.message);
    if (logisticasError && !esErrorEsquemaLogisticaFaltante(logisticasError)) {
      throw new Error(logisticasError.message);
    }
    if (
      workflowTransitionsError &&
      !esErrorEsquemaWorkflowTransitionsFaltante(workflowTransitionsError)
    ) {
      throw new Error(workflowTransitionsError.message);
    }

    const informeMap = indexarUltimoPorCaso(
      (informesData as HostInformeRecord[] | null) ?? []
    );
    const diagnosticoMap = indexarUltimoPorCaso(diagnosticosData);
    const cotizacionMap = indexarUltimoPorCaso(
      (cotizacionesData as HostCotizacionRecord[] | null) ?? []
    );
    const seguimientoMap = indexarUltimoPorCaso(seguimientosData);
    const logisticaMap = indexarUltimoPorCaso(
      logisticasError && esErrorEsquemaLogisticaFaltante(logisticasError)
        ? []
        : ((logisticasData as HostLogisticaRecord[] | null) ?? [])
    );
    const workflowTransitionsMap = agruparPorCaso(
      workflowTransitionsError &&
        esErrorEsquemaWorkflowTransitionsFaltante(workflowTransitionsError)
        ? []
        : ((workflowTransitionsData as HostWorkflowTransitionRecord[] | null) ?? [])
    );

    const remoteItems = ordenarWorklist(
      casos.map((caso) =>
        proyectarCasoWorklist(
          normalizarCaso(
            mapCasoFromHost({
              caso,
              informe: informeMap.get(caso.id) ?? null,
              diagnostico: diagnosticoMap.get(caso.id) ?? null,
              cotizacion: cotizacionMap.get(caso.id) ?? null,
              seguimiento: seguimientoMap.get(caso.id) ?? null,
              logistica: logisticaMap.get(caso.id) ?? null,
              workflowTransitions: workflowTransitionsMap.get(caso.id) ?? [],
              origen: "supabase.casos.collection",
            })
          ),
          {
            responsableActualRaw: caso.responsable_actual,
            responsableHumanoId: caso.responsable_humano_id,
            responsableHumanoNombre: caso.responsable_humano_nombre,
            responsableHumanoAsignadoPor: caso.responsable_humano_asignado_por,
            responsableHumanoAsignadoAt: caso.responsable_humano_asignado_at,
          }
        )
      )
    );
    const localItems = proyectarCasosHostBase(casosLocales, "opencore.dev.local");
    const items = ordenarWorklist([...remoteItems, ...localItems]);

    return {
      items,
      meta: construirMeta(items),
      bulk_items: construirBulkItems(items),
    };
  } catch (error) {
    if (esErrorSupabaseTransitorio(error)) {
      const casosLocales = await listarCasosLocalesDeDesarrollo();

      if (casosLocales.length > 0) {
        const items = ordenarWorklist(
          proyectarCasosHostBase(casosLocales, "opencore.dev.local")
        );

        return {
          items,
          meta: construirMeta(items),
          bulk_items: construirBulkItems(items),
        };
      }

      console.warn(
        "casos_normalizados_fallback:",
        construirMensajeErrorConectividadSupabase(
          "la lectura de casos normalizados",
          error
        )
      );
      return resultadoVacio();
    }

    throw error;
  }
}
