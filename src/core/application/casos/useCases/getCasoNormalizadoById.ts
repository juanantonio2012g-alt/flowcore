import { normalizarCaso } from "@/core/domain/casos";
import { mapCasoFromHost } from "../adapter/mapCasoFromHost";
import type {
  HostCasoBaseRecord,
  HostCotizacionRecord,
  HostDiagnosticoRecord,
  HostInformeRecord,
  HostLogisticaRecord,
  HostPostventaRecord,
  HostSeguimientoRecord,
  HostWorkflowTransitionRecord,
} from "../adapter/mapCasoFromHost";
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

async function getDiagnosticoByCasoId(
  id: string
): Promise<HostDiagnosticoRecord | null> {
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
        HostDiagnosticoRecord,
        "validado_por" | "resultado_validacion" | "observacion_validacion"
      > | null) ?? null
    ) as HostDiagnosticoRecord | null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostDiagnosticoRecord | null) ?? null;
}

async function getSeguimientoByCasoId(
  id: string
): Promise<HostSeguimientoRecord | null> {
  const supabase = createServerSupabaseClient();
  const selectBase = `
    id,
    caso_id,
    estado_comercial,
    proximo_paso,
    proxima_fecha,
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
      (legacyResult.data as Omit<HostSeguimientoRecord, "senales_comerciales"> | null) ??
        null
    ) as HostSeguimientoRecord | null;
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data as HostSeguimientoRecord | null) ?? null;
}

export async function getCasoNormalizadoById(id: string) {
  if (!id) {
    throw new Error("id es obligatorio");
  }

  const supabase = createServerSupabaseClient();

  const { data: casoData, error: casoError } = await supabase
    .from("casos")
    .select(`
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
      cliente_id,
      clientes (
        id,
        nombre,
        empresa
      )
    `)
    .eq("id", id)
    .single();

  if (casoError) {
    if (casoError.code === "PGRST116") {
      return null;
    }
    throw new Error(casoError.message);
  }

  const [
    { data: informeData, error: informeError },
    diagnosticoData,
    { data: cotizacionData, error: cotizacionError },
    seguimientoData,
    { data: logisticaData, error: logisticaError },
    { data: auditoriaData, error: auditoriaError },
    { data: postventaData, error: postventaError },
    { data: cierreTecnicoData, error: cierreTecnicoError },
    { data: workflowTransitionsData, error: workflowTransitionsError },
  ] = await Promise.all([
    supabase
      .from("informes_tecnicos")
      .select("id, caso_id, created_at")
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getDiagnosticoByCasoId(id),
    supabase
      .from("cotizaciones")
      .select("id, caso_id, estado, created_at")
      .eq("caso_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSeguimientoByCasoId(id),
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
  ]);

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

  return normalizarCaso(
    mapCasoFromHost({
      caso: casoData as HostCasoBaseRecord,
      informe: (informeData as HostInformeRecord | null) ?? null,
      diagnostico: diagnosticoData,
      cotizacion: (cotizacionData as HostCotizacionRecord | null) ?? null,
      seguimiento: seguimientoData ?? null,
      logistica:
        logisticaError && esErrorEsquemaLogisticaFaltante(logisticaError)
          ? null
          : ((logisticaData as HostLogisticaRecord | null) ?? null),
      auditoria:
        (auditoriaData as import("../adapter/mapCasoFromHost").HostAuditoriaRecord | null) ?? null,
      postventa:
        postventaError && esErrorEsquemaPostventaFaltante(postventaError)
          ? null
          : ((postventaData as HostPostventaRecord | null) ?? null),
      cierreTecnico:
        cierreTecnicoError && esErrorEsquemaCierreTecnicoFaltante(cierreTecnicoError)
          ? null
          : ((cierreTecnicoData as import("../adapter/mapCasoFromHost").HostCierreTecnicoRecord | null) ?? null),
      workflowTransitions:
        workflowTransitionsError && esErrorEsquemaWorkflowTransitionsFaltante(workflowTransitionsError)
          ? []
          : ((workflowTransitionsData as HostWorkflowTransitionRecord[] | null) ?? []),
      origen: "supabase.casos.single",
    })
  );
}
