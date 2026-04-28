import { normalizarDetalleCaso } from "@/core/domain/casos/detalle";
import {
  mapCasoDetalleFromHost,
  type HostCasoDetalleRecord,
  type HostCambioBitacoraDetalleRecord,
  type HostCotizacionDetalleRecord,
  type HostCierreTecnicoDetalleRecord,
  type HostDiagnosticoAgenteDetalleRecord,
  type HostDiagnosticoDetalleRecord,
  type HostEvidenciaDetalleRecord,
  type HostInformeDetalleRecord,
  type HostLogisticaDetalleRecord,
  type HostPostventaDetalleRecord,
  type HostSeguimientoDetalleRecord,
} from "../adapter/mapCasoDetalleFromHost";
import type { HostWorkflowTransitionRecord } from "../adapter/mapCasoFromHost";
import {
  completarCamposValidacionDiagnosticoCompat,
  esErrorEsquemaValidacionDiagnosticoFaltante,
} from "../adapter/diagnosticoValidacionCompat";
import {
  completarCamposSeguimientoComercialCompat,
  esErrorEsquemaSeguimientoComercialFaltante,
} from "../adapter/seguimientoComercialCompat";
import { esErrorEsquemaWorkflowTransitionsFaltante } from "../adapter/workflowTransitionsCompat";
import { esErrorEsquemaLogisticaFaltante } from "../adapter/logisticaCompat";
import { esErrorEsquemaPostventaFaltante } from "../adapter/postventaCompat";
import { esErrorEsquemaCierreTecnicoFaltante } from "../adapter/cierreTecnicoCompat";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { obtenerCasoLocalDeDesarrolloPorId } from "@/lib/dev/casos-local-store";

async function getDiagnosticoDetalleByCasoId(
  id: string
): Promise<HostDiagnosticoDetalleRecord | null> {
  const supabase = createServerSupabaseClient();
  const selectBase = `
    id,
    caso_id,
    problematica_identificada,
    causa_probable,
    nivel_certeza,
    categoria_caso,
    solucion_recomendada,
    producto_recomendado,
    proceso_sugerido,
    observaciones_tecnicas,
    requiere_validacion,
    fecha_validacion,
    created_at
  `;
  const { data, error } = await supabase
    .from("diagnosticos")
    .select(`
      ${selectBase},
      validado_por,
      resultado_validacion,
      observacion_validacion
    `)
    .eq("caso_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && esErrorEsquemaValidacionDiagnosticoFaltante(error)) {
    const legacyResult = await supabase
      .from("diagnosticos")
      .select(selectBase)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return completarCamposValidacionDiagnosticoCompat(
      (legacyResult.data as Omit<
        HostDiagnosticoDetalleRecord,
        "validado_por" | "resultado_validacion" | "observacion_validacion"
      > | null) ?? null
    ) as HostDiagnosticoDetalleRecord | null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostDiagnosticoDetalleRecord | null) ?? null;
}

async function getSeguimientoDetalleByCasoId(
  id: string
): Promise<HostSeguimientoDetalleRecord | null> {
  const supabase = createServerSupabaseClient();
  const selectBase = `
    id,
    caso_id,
    fecha,
    tipo_seguimiento,
    resultado,
    proximo_paso,
    proxima_fecha,
    estado_comercial,
    observaciones_cliente,
    created_at
  `;
  const { data, error } = await supabase
    .from("seguimientos")
    .select(`
      ${selectBase},
      senales_comerciales
    `)
    .eq("caso_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && esErrorEsquemaSeguimientoComercialFaltante(error)) {
    const legacyResult = await supabase
      .from("seguimientos")
      .select(selectBase)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (legacyResult.error) {
      throw new Error(legacyResult.error.message);
    }

    return completarCamposSeguimientoComercialCompat(
      (legacyResult.data as Omit<
        HostSeguimientoDetalleRecord,
        "senales_comerciales"
      > | null) ?? null
    ) as HostSeguimientoDetalleRecord | null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostSeguimientoDetalleRecord | null) ?? null;
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

const CASO_DETALLE_SELECT_BASE = `
  id,
  estado,
  estado_tecnico,
  estado_comercial,
  prioridad,
  descripcion_inicial,
  canal_entrada,
  tipo_solicitud,
  proxima_accion,
  proxima_fecha,
  responsable_actual,
  creado_por,
  diagnostico_por,
  cotizacion_por,
  seguimiento_por,
  nivel_confianza_cliente,
  nivel_friccion_cliente,
  desgaste_operativo,
  claridad_intencion,
  probabilidad_conversion,
  observacion_relacional,
  created_at,
  cliente_id,
  clientes (
    id,
    nombre,
    empresa
  )
`;

const CASO_DETALLE_SELECT_CON_ASIGNACION = `
  ${CASO_DETALLE_SELECT_BASE},
  responsable_humano_id,
  responsable_humano_nombre,
  responsable_humano_asignado_por,
  responsable_humano_asignado_at
`;

async function getCasoDetalleRecordById(id: string) {
  const supabase = createServerSupabaseClient();

  const result = await supabase
    .from("casos")
    .select(CASO_DETALLE_SELECT_CON_ASIGNACION)
    .eq("id", id)
    .single();

  if (result.error && esErrorCamposAsignacionHumanaFaltantes(result.error)) {
    return supabase
      .from("casos")
      .select(CASO_DETALLE_SELECT_BASE)
      .eq("id", id)
      .single();
  }

  return result;
}

export async function getCasoDetalleNormalizadoById(id: string) {
  if (!id) {
    throw new Error("id es obligatorio");
  }

  if (process.env.NODE_ENV === "development" && id.startsWith("local-caso-")) {
    const casoLocal = await obtenerCasoLocalDeDesarrolloPorId(id);

    if (!casoLocal) {
      throw new Error("No se encontró el caso local de desarrollo.");
    }

    return normalizarDetalleCaso(
      mapCasoDetalleFromHost({
        caso: {
          ...casoLocal,
          estado: "solicitud_recibida",
          descripcion_inicial: casoLocal.observacion_relacional,
          canal_entrada: "desarrollo_local",
          responsable_actual: null,
          responsable_humano_id: null,
          responsable_humano_nombre: null,
          responsable_humano_asignado_por: null,
          responsable_humano_asignado_at: null,
          creado_por: "opencore.dev.local",
          diagnostico_por: null,
          cotizacion_por: null,
          seguimiento_por: null,
        },
        informe: null,
        diagnostico: null,
        cotizacion: null,
        seguimiento: null,
        logistica: null,
        auditoria: null,
        postventa: null,
        cierreTecnico: null,
        workflowTransitions: [],
        diagnosticoAgente: null,
        evidencias: [],
        bitacora: [],
        origen: "opencore.dev.local",
        timestamp: casoLocal.created_at ?? new Date().toISOString(),
      })
    );
  }

  const supabase = createServerSupabaseClient();

  const [
    { data: casoData, error: casoError },
    { data: informeData, error: informeError },
    diagnosticoData,
    { data: cotizacionData, error: cotizacionError },
    seguimientoData,
    { data: logisticaData, error: logisticaError },
    { data: auditoriaData, error: auditoriaError },
    { data: postventaData, error: postventaError },
    { data: cierreTecnicoData, error: cierreTecnicoError },
    { data: workflowTransitionsData, error: workflowTransitionsError },
    { data: diagnosticoAgenteData, error: diagnosticoAgenteError },
    { data: bitacoraData, error: bitacoraError },
  ] = await Promise.all([
    getCasoDetalleRecordById(id),
    supabase
      .from("informes_tecnicos")
      .select(`
        id,
        caso_id,
        fecha_recepcion,
        resumen_tecnico,
        hallazgos_principales,
        estado_revision,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDiagnosticoDetalleByCasoId(id),
    supabase
      .from("cotizaciones")
      .select(`
        id,
        caso_id,
        fecha_cotizacion,
        solucion_asociada,
        productos_incluidos,
        cantidades,
        condiciones,
        observaciones,
        monto,
        estado,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSeguimientoDetalleByCasoId(id),
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
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("auditorias")
      .select(`
        id,
        caso_id,
        fecha_auditoria,
        responsable_auditoria,
        estado_auditoria,
        observaciones_auditoria,
        conformidad_cliente,
        requiere_correccion,
        fecha_cierre_tecnico,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("postventas")
      .select(`
        id,
        caso_id,
        fecha_postventa,
        estado_postventa,
        observacion_postventa,
        requiere_accion,
        proxima_accion,
        proxima_fecha,
        conformidad_final,
        responsable_postventa,
        notas,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cierres_tecnicos")
      .select(`
        id,
        caso_id,
        fecha_cierre_tecnico,
        responsable_cierre,
        motivo_cierre,
        observacion_cierre,
        postventa_resuelta,
        requiere_postventa_adicional,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
      .eq("caso_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("diagnosticos_agente")
      .select(`
        id,
        resumen_del_caso,
        sintomas_clave,
        categoria_probable,
        causa_probable,
        causas_alternativas,
        nivel_certeza,
        solucion_recomendada,
        producto_recomendado,
        proceso_sugerido,
        observaciones_tecnicas,
        riesgos_o_advertencias,
        requiere_validacion,
        requiere_escalamiento,
        estado_caso,
        caso_listo_para_cotizacion,
        estado_comercial,
        proximo_paso,
        suficiencia_de_evidencia,
        riesgo_de_error,
        coincidencia_con_patron,
        necesidad_de_revision_humana,
        fuente_agente,
        version_prompt,
        version_modelo,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bitacora_cambios_caso")
      .select(`
        id,
        caso_id,
        campo,
        valor_anterior,
        valor_nuevo,
        origen,
        actor,
        created_at
      `)
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (casoError) {
    if (casoError.code === "PGRST116") {
      return null;
    }
    throw new Error(casoError.message);
  }
  if (informeError) throw new Error(informeError.message);
  if (cotizacionError) throw new Error(cotizacionError.message);
  if (logisticaError && !esErrorEsquemaLogisticaFaltante(logisticaError)) {
    throw new Error(logisticaError.message);
  }
  if (auditoriaError) throw new Error(auditoriaError.message);
  if (postventaError && !esErrorEsquemaPostventaFaltante(postventaError)) {
    throw new Error(postventaError.message);
  }
  if (cierreTecnicoError && !esErrorEsquemaCierreTecnicoFaltante(cierreTecnicoError)) {
    throw new Error(cierreTecnicoError.message);
  }
  if (workflowTransitionsError && !esErrorEsquemaWorkflowTransitionsFaltante(workflowTransitionsError)) {
    throw new Error(workflowTransitionsError.message);
  }
  if (diagnosticoAgenteError) throw new Error(diagnosticoAgenteError.message);
  if (bitacoraError) throw new Error(bitacoraError.message);

  let evidenciasData: HostEvidenciaDetalleRecord[] = [];
  const informe = (informeData as HostInformeDetalleRecord | null) ?? null;

  if (informe?.id) {
    const { data: evidenciasResult, error: evidenciasError } = await supabase
      .from("evidencias_informe")
      .select(`
        id,
        archivo_path,
        archivo_url,
        nombre_archivo,
        descripcion,
        tipo,
        created_at
      `)
      .eq("informe_id", informe.id)
      .order("created_at", { ascending: false });

    if (evidenciasError) {
      throw new Error(evidenciasError.message);
    }

    evidenciasData = (evidenciasResult as HostEvidenciaDetalleRecord[] | null) ?? [];
  }

  return normalizarDetalleCaso(
    mapCasoDetalleFromHost({
      caso: casoData as HostCasoDetalleRecord,
      informe,
      diagnostico: diagnosticoData,
      cotizacion: (cotizacionData as HostCotizacionDetalleRecord | null) ?? null,
      seguimiento: seguimientoData ?? null,
      logistica:
        logisticaError && esErrorEsquemaLogisticaFaltante(logisticaError)
          ? null
          : ((logisticaData as HostLogisticaDetalleRecord | null) ?? null),
      auditoria:
        (auditoriaData as import("../adapter/mapCasoDetalleFromHost").HostAuditoriaDetalleRecord | null) ?? null,
      postventa:
        postventaError && esErrorEsquemaPostventaFaltante(postventaError)
          ? null
          : ((postventaData as HostPostventaDetalleRecord | null) ?? null),
      cierreTecnico:
        cierreTecnicoError && esErrorEsquemaCierreTecnicoFaltante(cierreTecnicoError)
          ? null
          : ((cierreTecnicoData as HostCierreTecnicoDetalleRecord | null) ?? null),
      workflowTransitions:
        workflowTransitionsError && esErrorEsquemaWorkflowTransitionsFaltante(workflowTransitionsError)
          ? []
          : ((workflowTransitionsData as HostWorkflowTransitionRecord[] | null) ?? []),
      diagnosticoAgente:
        (diagnosticoAgenteData as HostDiagnosticoAgenteDetalleRecord | null) ?? null,
      evidencias: evidenciasData,
      bitacora:
        (bitacoraData as HostCambioBitacoraDetalleRecord[] | null) ?? [],
      origen: "supabase.casos.detalle",
    })
  );
}
