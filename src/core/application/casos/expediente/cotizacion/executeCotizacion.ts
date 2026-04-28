import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esErrorEsquemaWorkflowTransitionsFaltante } from "@/core/application/casos/adapter/workflowTransitionsCompat";
import { registerWorkflowTransitions } from "@/core/application/casos/workflow/registerWorkflowTransitions";
import type {
  CotizacionChange,
  CotizacionCommand,
  CotizacionResult,
} from "./contracts";
import { validateCotizacionCommand } from "./validators";

type CotizacionRecord = {
  id: string;
  caso_id: string;
  fecha_cotizacion: string | null;
  solucion_asociada: string | null;
  productos_incluidos: string | null;
  cantidades: string | null;
  condiciones: string | null;
  observaciones: string | null;
  monto: number | null;
  estado: string | null;
  created_at: string | null;
};

type CaseWriteState = {
  responsable_actual: string | null;
  cotizacion_por: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
};

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecuteCotizacionOptions = {
  supabase?: SupabaseClient;
};

type WorkflowTransitionLookupRecord = {
  id: string;
};

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

function crearResultadoBase(command: CotizacionCommand): CotizacionResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    cotizacion_id: command.cotizacion_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.cotizacion",
    },
  };
}

async function getCotizacionById(
  cotizacionId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<CotizacionRecord | null> {
  const { data, error } = await supabase
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
    .eq("id", cotizacionId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CotizacionRecord | null) ?? null;
}

async function getCaseWriteState(
  casoId: string,
  supabase: SupabaseClient
): Promise<CaseWriteState | null> {
  const { data, error } = await supabase
    .from("casos")
    .select("responsable_actual, cotizacion_por, proxima_accion, proxima_fecha")
    .eq("id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CaseWriteState | null) ?? null;
}

function buildCotizacionPayload(command: CotizacionCommand) {
  return {
    fecha_cotizacion: command.payload.fecha_cotizacion ?? null,
    solucion_asociada:
      normalizarTextoNullable(command.payload.solucion_asociada) ?? null,
    productos_incluidos:
      normalizarTextoNullable(command.payload.productos_incluidos) ?? null,
    cantidades: normalizarTextoNullable(command.payload.cantidades) ?? null,
    condiciones: normalizarTextoNullable(command.payload.condiciones) ?? null,
    observaciones: normalizarTextoNullable(command.payload.observaciones) ?? null,
    monto: typeof command.payload.monto === "number" ? command.payload.monto : null,
    estado: normalizarTextoNullable(command.payload.estado) ?? null,
  };
}

function hasOwn<K extends PropertyKey>(
  value: object,
  key: K
): value is Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function buildCotizacionUpdatePayload(command: CotizacionCommand) {
  const payload = command.payload ?? {};
  const updatePayload: Partial<ReturnType<typeof buildCotizacionPayload>> = {};

  if (hasOwn(payload, "fecha_cotizacion")) {
    updatePayload.fecha_cotizacion = command.payload.fecha_cotizacion ?? null;
  }

  if (hasOwn(payload, "solucion_asociada")) {
    updatePayload.solucion_asociada =
      normalizarTextoNullable(command.payload.solucion_asociada) ?? null;
  }

  if (hasOwn(payload, "productos_incluidos")) {
    updatePayload.productos_incluidos =
      normalizarTextoNullable(command.payload.productos_incluidos) ?? null;
  }

  if (hasOwn(payload, "cantidades")) {
    updatePayload.cantidades =
      normalizarTextoNullable(command.payload.cantidades) ?? null;
  }

  if (hasOwn(payload, "condiciones")) {
    updatePayload.condiciones =
      normalizarTextoNullable(command.payload.condiciones) ?? null;
  }

  if (hasOwn(payload, "observaciones")) {
    updatePayload.observaciones =
      normalizarTextoNullable(command.payload.observaciones) ?? null;
  }

  if (hasOwn(payload, "monto")) {
    updatePayload.monto =
      typeof command.payload.monto === "number" ? command.payload.monto : null;
  }

  if (hasOwn(payload, "estado")) {
    updatePayload.estado = normalizarTextoNullable(command.payload.estado) ?? null;
  }

  return updatePayload;
}

function buildCotizacionEffectiveState(args: {
  previous: CotizacionRecord | null;
  next: Partial<ReturnType<typeof buildCotizacionPayload>>;
}) {
  return {
    fecha_cotizacion: Object.prototype.hasOwnProperty.call(
      args.next,
      "fecha_cotizacion"
    )
      ? (args.next.fecha_cotizacion ?? null)
      : (args.previous?.fecha_cotizacion ?? null),
    solucion_asociada: Object.prototype.hasOwnProperty.call(
      args.next,
      "solucion_asociada"
    )
      ? (args.next.solucion_asociada ?? null)
      : (args.previous?.solucion_asociada ?? null),
    productos_incluidos: Object.prototype.hasOwnProperty.call(
      args.next,
      "productos_incluidos"
    )
      ? (args.next.productos_incluidos ?? null)
      : (args.previous?.productos_incluidos ?? null),
    cantidades: Object.prototype.hasOwnProperty.call(args.next, "cantidades")
      ? (args.next.cantidades ?? null)
      : (args.previous?.cantidades ?? null),
    condiciones: Object.prototype.hasOwnProperty.call(args.next, "condiciones")
      ? (args.next.condiciones ?? null)
      : (args.previous?.condiciones ?? null),
    observaciones: Object.prototype.hasOwnProperty.call(
      args.next,
      "observaciones"
    )
      ? (args.next.observaciones ?? null)
      : (args.previous?.observaciones ?? null),
    monto:
      Object.prototype.hasOwnProperty.call(args.next, "monto")
        ? args.next.monto
        : (args.previous?.monto ?? null),
    estado: Object.prototype.hasOwnProperty.call(args.next, "estado")
      ? (args.next.estado ?? null)
      : (args.previous?.estado ?? null),
  };
}

function buildCotizacionChanges(args: {
  action: CotizacionCommand["accion"];
  previous: CotizacionRecord | null;
  next: Partial<ReturnType<typeof buildCotizacionPayload>>;
}): CotizacionChange[] {
  const { action, previous, next } = args;
  const source = previous ?? {
    fecha_cotizacion: null,
    solucion_asociada: null,
    productos_incluidos: null,
    cantidades: null,
    condiciones: null,
    observaciones: null,
    monto: null,
    estado: null,
  };

  const campos: Array<keyof ReturnType<typeof buildCotizacionPayload>> = [
    "fecha_cotizacion",
    "solucion_asociada",
    "productos_incluidos",
    "cantidades",
    "condiciones",
    "observaciones",
    "monto",
    "estado",
  ];

  return campos
    .filter(
      (campo) =>
        action === "registrar_cotizacion" ||
        (Object.prototype.hasOwnProperty.call(next, campo) &&
          source[campo] !== next[campo])
    )
    .map((campo) => ({
      campo: `cotizacion.${campo}`,
      anterior:
        typeof source[campo] === "number"
          ? String(source[campo])
          : source[campo] ?? null,
      nuevo:
        typeof next[campo] === "number"
          ? String(next[campo])
          : next[campo] ?? null,
    }));
}

function buildCaseSyncPayload(command: CotizacionCommand, actor: string) {
  const payload: Record<string, string | null> = {
    responsable_actual: "Comercial",
    cotizacion_por: actor,
  };

  const proximaAccion =
    normalizarTextoNullable(command.payload.proxima_accion) ?? null;
  const proximaFecha = command.payload.proxima_fecha ?? null;

  if (proximaAccion) {
    payload.proxima_accion = proximaAccion;
  }

  if (proximaFecha) {
    payload.proxima_fecha = proximaFecha;
  }

  return payload;
}

function buildCaseChanges(args: {
  caseState: CaseWriteState | null;
  casePayload: Record<string, string | null>;
  actor: string;
}): CotizacionChange[] {
  const { caseState, casePayload, actor } = args;
  const cambios: CotizacionChange[] = [];

  if ((caseState?.responsable_actual ?? "") !== "Comercial") {
    cambios.push({
      campo: "responsable_actual",
      anterior: caseState?.responsable_actual ?? null,
      nuevo: "Comercial",
    });
  }

  if ((caseState?.cotizacion_por ?? "") !== actor) {
    cambios.push({
      campo: "cotizacion_por",
      anterior: caseState?.cotizacion_por ?? null,
      nuevo: actor,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(casePayload, "proxima_accion") &&
    (caseState?.proxima_accion ?? "") !== (casePayload.proxima_accion ?? "")
  ) {
    cambios.push({
      campo: "proxima_accion",
      anterior: caseState?.proxima_accion ?? null,
      nuevo: casePayload.proxima_accion ?? null,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(casePayload, "proxima_fecha") &&
    (caseState?.proxima_fecha ?? "") !== (casePayload.proxima_fecha ?? "")
  ) {
    cambios.push({
      campo: "proxima_fecha",
      anterior: caseState?.proxima_fecha ?? null,
      nuevo: casePayload.proxima_fecha ?? null,
    });
  }

  return cambios;
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: CotizacionChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) =>
      ["responsable_actual", "cotizacion_por", "proxima_accion", "proxima_fecha"].includes(
        cambio.campo
      )
    )
    .map((cambio) => ({
      caso_id: args.casoId,
      campo: cambio.campo,
      valor_anterior: cambio.anterior ?? null,
      valor_nuevo: cambio.nuevo ?? null,
      origen: "manual",
      actor: args.actor,
    }));
}

async function registrarBitacora(
  rows: BitacoraPayload[],
  advertencias: ActionWarning[],
  supabase: SupabaseClient
) {
  if (!rows.length) return;

  const { error } = await supabase.from("bitacora_cambios_caso").insert(rows);

  if (error) {
    advertencias.push({
      caso_id: rows[0]?.caso_id,
      codigo: "bitacora_no_registrada",
      mensaje:
        "La cotización se registró, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

function describirErrorSupabase(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const supabaseError = error as SupabaseErrorLike;
  const partes = [
    supabaseError.message,
    supabaseError.details,
    supabaseError.hint,
    supabaseError.code ? `code=${supabaseError.code}` : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return partes.length > 0 ? partes.join(" | ") : null;
}

async function existeTransicionCotizacionEmitida(args: {
  casoId: string;
  cotizacionId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await args.supabase
    .from("workflow_transitions")
    .select("id")
    .eq("caso_id", args.casoId)
    .eq("transition_code", "cotizacion_emitida")
    .eq("evidencia_ref", args.cotizacionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!(data as WorkflowTransitionLookupRecord | null)?.id;
}

async function asegurarTransicionCotizacionEmitida(args: {
  casoId: string;
  cotizacionId: string | null;
  actor: string;
  origin: string;
  fechaCotizacion?: string | null;
  observacion?: string | null;
  supabase: SupabaseClient;
}): Promise<
  | {
      ok: true;
      created: boolean;
    }
  | {
      ok: false;
      message: string;
    }
> {
  if (!args.cotizacionId) {
    return {
      ok: true,
      created: false,
    };
  }

  try {
    const yaExiste = await existeTransicionCotizacionEmitida({
      casoId: args.casoId,
      cotizacionId: args.cotizacionId,
      supabase: args.supabase,
    });

    if (yaExiste) {
      return {
        ok: true,
        created: false,
      };
    }
  } catch (error) {
    if (esErrorEsquemaWorkflowTransitionsFaltante(error)) {
      return {
        ok: false,
        message:
          "La tabla workflow_transitions no está disponible para registrar la transición formal de cotización emitida.",
      };
    }

    return {
      ok: false,
      message:
        describirErrorSupabase(error) ??
        "No se pudo verificar la transición formal de cotización emitida.",
    };
  }

  const workflowTransitionResult = await registerWorkflowTransitions(
    [
      {
        caso_id: args.casoId,
        transition_code: "cotizacion_emitida",
        from_stage: "cotizacion",
        to_stage: "cotizacion",
        actor: args.actor,
        origin: args.origin,
        occurred_at: args.fechaCotizacion ?? undefined,
        observacion: args.observacion ?? null,
        evidencia_ref: args.cotizacionId,
      },
    ],
    args.supabase
  );

  if (!workflowTransitionResult.ok) {
    return workflowTransitionResult;
  }

  return {
    ok: true,
    created: true,
  };
}

export async function executeCotizacion(
  command: CotizacionCommand,
  options: ExecuteCotizacionOptions = {}
): Promise<CotizacionResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const cotizacionActual =
    command.accion === "actualizar_cotizacion" && command.cotizacion_id
      ? await getCotizacionById(command.cotizacion_id, command.caso_id, supabase)
      : null;

  const validation = validateCotizacionCommand({
    command,
    caso,
    cotizacionExiste: !!cotizacionActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const cotizacionPayload =
    command.accion === "registrar_cotizacion"
      ? buildCotizacionPayload(command)
      : buildCotizacionUpdatePayload(command);
  const caseState = await getCaseWriteState(command.caso_id, supabase);
  const casePayload = buildCaseSyncPayload(command, actor);
  const cotizacionCambios = buildCotizacionChanges({
    action: command.accion,
    previous: cotizacionActual,
    next: cotizacionPayload,
  });
  const cotizacionEffectiveState = buildCotizacionEffectiveState({
    previous: cotizacionActual,
    next: cotizacionPayload,
  });
  const caseCambios = buildCaseChanges({
    caseState,
    casePayload,
    actor,
  });

  let cotizacionId = command.cotizacion_id ?? null;

  if (command.accion === "registrar_cotizacion") {
    const { data, error } = await supabase
      .from("cotizaciones")
      .insert({
        caso_id: command.caso_id,
        ...cotizacionPayload,
      })
      .select("id")
      .single();

    if (error || !data) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "cotizacion_no_guardada",
        mensaje: "No se pudo registrar la cotización.",
      });
      return result;
    }

    cotizacionId = (data as { id: string }).id;
  } else {
    const { data: updatedCotizacion, error } = await supabase
      .from("cotizaciones")
      .update(cotizacionPayload)
      .eq("id", command.cotizacion_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "cotizacion_no_actualizada",
        mensaje: "No se pudo actualizar la cotización.",
      });
      return result;
    }

    if (!updatedCotizacion?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "cotizacion_no_actualizada",
        mensaje:
          "No se pudo actualizar la cotización. Verifica permisos o que pertenezca al caso indicado.",
      });
      return result;
    }
  }

  if (caseCambios.length > 0) {
    const { data: updatedCaso, error: casoError } = await supabase
      .from("casos")
      .update(casePayload)
      .eq("id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (casoError) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "caso_no_sincronizado",
        mensaje:
          "La cotización se registró, pero no se pudo sincronizar el ownership comercial del caso.",
      });
      result.cotizacion_id = cotizacionId;
      return result;
    }

    if (!updatedCaso?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "caso_no_sincronizado",
        mensaje:
          "La cotización se registró, pero no se pudo sincronizar el ownership comercial del caso. Verifica permisos o que el caso exista.",
      });
      result.cotizacion_id = cotizacionId;
      return result;
    }
  }

  result.ok = true;
  result.cotizacion_id = cotizacionId;
  result.cambios = [...cotizacionCambios, ...caseCambios];
  result.advertencias = validation.advertencias;

  const workflowTransitionResult = await asegurarTransicionCotizacionEmitida({
    casoId: command.caso_id,
    cotizacionId,
    actor,
    origin: result.metadata.origen,
    fechaCotizacion: command.payload.fecha_cotizacion ?? null,
    observacion: cotizacionEffectiveState.observaciones,
    supabase,
  });

  if (!workflowTransitionResult.ok) {
    result.ok = false;
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "workflow_transition_no_registrada",
      mensaje: `La cotización se guardó, pero no se pudo persistir la transición formal del workflow. ${workflowTransitionResult.message}`,
    });
    return result;
  }

  if (command.accion === "actualizar_cotizacion" && workflowTransitionResult.created) {
    result.advertencias.push({
      caso_id: command.caso_id,
      codigo: "workflow_transition_backfilled",
      mensaje:
        "La cotización ya existía y se registró la transición formal faltante en workflow.",
    });
  }

  const autoasignacion = await sincronizarResponsableHumanoAutomatico({
    caso_id: command.caso_id,
    actor,
    supabase,
  });
  result.cambios = [...result.cambios, ...autoasignacion.cambios];
  result.advertencias = [...result.advertencias, ...autoasignacion.advertencias];

  await registrarBitacora(
    buildBitacoraRows({
      casoId: command.caso_id,
      actor,
      cambios: caseCambios,
    }),
    result.advertencias,
    supabase
  );

  return result;
}
