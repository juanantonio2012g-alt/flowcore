import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esErrorEsquemaLogisticaFaltante } from "@/core/application/casos/adapter/logisticaCompat";
import type {
  LogisticaChange,
  LogisticaCommand,
  LogisticaResult,
} from "./contracts";
import { validateLogisticaCommand } from "./validators";

type LogisticaRecord = {
  id: string;
  caso_id: string;
  fecha_programada: string | null;
  responsable: string | null;
  estado_logistico: string | null;
  observacion_logistica: string | null;
  confirmacion_entrega: boolean | null;
  fecha_entrega: string | null;
  created_at: string | null;
};

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecuteLogisticaOptions = {
  supabase?: SupabaseClient;
};

type LogisticaPayload = {
  fecha_programada: string | null;
  responsable: string | null;
  estado_logistico: string | null;
  observacion_logistica: string | null;
  confirmacion_entrega: boolean;
  fecha_entrega: string | null;
};

function crearResultadoBase(command: LogisticaCommand): LogisticaResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    logistica_id: command.logistica_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.logistica",
    },
  };
}

function payloadTieneCampo(
  payload: LogisticaCommand["payload"],
  campo: keyof LogisticaCommand["payload"]
) {
  return Object.prototype.hasOwnProperty.call(payload, campo);
}

function buildLogisticaPayload(command: LogisticaCommand): LogisticaPayload {
  return {
    fecha_programada: command.payload.fecha_programada ?? null,
    responsable: normalizarTextoNullable(command.payload.responsable) ?? null,
    estado_logistico:
      normalizarTextoNullable(command.payload.estado_logistico) ?? null,
    observacion_logistica:
      normalizarTextoNullable(command.payload.observacion_logistica) ?? null,
    confirmacion_entrega: command.payload.confirmacion_entrega === true,
    fecha_entrega: command.payload.fecha_entrega ?? null,
  };
}

function buildLogisticaUpdatePayload(
  command: LogisticaCommand
): Partial<LogisticaPayload> {
  const payload: Partial<LogisticaPayload> = {};

  if (payloadTieneCampo(command.payload, "fecha_programada")) {
    payload.fecha_programada = command.payload.fecha_programada ?? null;
  }

  if (payloadTieneCampo(command.payload, "responsable")) {
    payload.responsable =
      normalizarTextoNullable(command.payload.responsable) ?? null;
  }

  if (payloadTieneCampo(command.payload, "estado_logistico")) {
    payload.estado_logistico =
      normalizarTextoNullable(command.payload.estado_logistico) ?? null;
  }

  if (payloadTieneCampo(command.payload, "observacion_logistica")) {
    payload.observacion_logistica =
      normalizarTextoNullable(command.payload.observacion_logistica) ?? null;
  }

  if (payloadTieneCampo(command.payload, "confirmacion_entrega")) {
    payload.confirmacion_entrega = command.payload.confirmacion_entrega === true;
  }

  if (payloadTieneCampo(command.payload, "fecha_entrega")) {
    payload.fecha_entrega = command.payload.fecha_entrega ?? null;
  }

  return payload;
}

function buildLogisticaEffectivePayload(args: {
  action: LogisticaCommand["accion"];
  command: LogisticaCommand;
  previous: LogisticaRecord | null;
}): LogisticaPayload {
  if (args.action === "registrar_logistica" || !args.previous) {
    return buildLogisticaPayload(args.command);
  }

  return {
    fecha_programada: args.previous.fecha_programada ?? null,
    responsable: args.previous.responsable ?? null,
    estado_logistico: args.previous.estado_logistico ?? null,
    observacion_logistica: args.previous.observacion_logistica ?? null,
    confirmacion_entrega: args.previous.confirmacion_entrega === true,
    fecha_entrega: args.previous.fecha_entrega ?? null,
    ...buildLogisticaUpdatePayload(args.command),
  };
}

function buildCaseSyncPayload(
  payload: LogisticaPayload,
  actor: string,
  commandPayload: LogisticaCommand["payload"]
) {
  const update: Record<string, string | null> = {
    seguimiento_por: actor,
  };

  const proximaAccionExplicita = payloadTieneCampo(commandPayload, "proxima_accion")
    ? normalizarTextoNullable(commandPayload.proxima_accion) ?? null
    : null;
  const proximaFechaExplicita = payloadTieneCampo(commandPayload, "proxima_fecha")
    ? commandPayload.proxima_fecha ?? null
    : null;

  if (payload.responsable) {
    update.responsable_actual = payload.responsable;
  }

  switch (payload.estado_logistico) {
    case "entregado":
      update.proxima_accion =
        proximaAccionExplicita ?? "Confirmar entrega realizada";
      update.proxima_fecha = proximaFechaExplicita ?? payload.fecha_entrega?.slice(0, 10) ?? null;
      return update;
    case "en_ejecucion":
      update.proxima_accion = proximaAccionExplicita ?? "Ejecutar entrega";
      update.proxima_fecha = proximaFechaExplicita ?? payload.fecha_programada ?? null;
      return update;
    case "incidencia":
      update.proxima_accion = proximaAccionExplicita ?? "Resolver incidencia logística";
      update.proxima_fecha = proximaFechaExplicita ?? payload.fecha_programada ?? null;
      return update;
    case "programado":
      update.proxima_accion =
        proximaAccionExplicita ?? "Coordinar ejecución o entrega";
      update.proxima_fecha = proximaFechaExplicita ?? payload.fecha_programada ?? null;
      return update;
    default:
      update.proxima_accion = proximaAccionExplicita ?? "Confirmar programación";
      update.proxima_fecha = proximaFechaExplicita ?? payload.fecha_programada ?? null;
      return update;
  }
}

function buildLogisticaChanges(args: {
  action: LogisticaCommand["accion"];
  previous: LogisticaRecord | null;
  next: LogisticaPayload;
}): LogisticaChange[] {
  const { action, previous, next } = args;
  const source = previous ?? {
    fecha_programada: null,
    responsable: null,
    estado_logistico: null,
    observacion_logistica: null,
    confirmacion_entrega: null,
    fecha_entrega: null,
  };

  const campos: Array<keyof LogisticaPayload> = [
    "fecha_programada",
    "responsable",
    "estado_logistico",
    "observacion_logistica",
    "confirmacion_entrega",
    "fecha_entrega",
  ];

  return campos
    .filter((campo) => action === "registrar_logistica" || source[campo] !== next[campo])
    .map((campo) => ({
      campo: `logistica.${campo}`,
      anterior:
        typeof source[campo] === "boolean"
          ? source[campo]
            ? "true"
            : "false"
          : (source[campo] as string | null) ?? null,
      nuevo:
        typeof next[campo] === "boolean"
          ? next[campo]
            ? "true"
            : "false"
          : (next[campo] as string | null) ?? null,
    }));
}

function buildCaseChanges(args: {
  caso: Awaited<ReturnType<typeof getCasoNormalizadoById>>;
  casePayload: Record<string, string | null>;
}): LogisticaChange[] {
  const { caso, casePayload } = args;
  if (!caso) return [];

  const cambios: LogisticaChange[] = [];

  if (
    Object.prototype.hasOwnProperty.call(casePayload, "proxima_accion") &&
    (caso.proxima_accion ?? "") !== (casePayload.proxima_accion ?? "")
  ) {
    cambios.push({
      campo: "proxima_accion",
      anterior: caso.proxima_accion,
      nuevo: casePayload.proxima_accion,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(casePayload, "proxima_fecha") &&
    (caso.proxima_fecha ?? "") !== (casePayload.proxima_fecha ?? "")
  ) {
    cambios.push({
      campo: "proxima_fecha",
      anterior: caso.proxima_fecha,
      nuevo: casePayload.proxima_fecha,
    });
  }

  if (
    Object.prototype.hasOwnProperty.call(casePayload, "responsable_actual") &&
    (casePayload.responsable_actual ?? "") !== ""
  ) {
    cambios.push({
      campo: "responsable_actual",
      anterior: null,
      nuevo: casePayload.responsable_actual,
    });
  }

  return cambios;
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: LogisticaChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) =>
      ["proxima_accion", "proxima_fecha", "responsable_actual"].includes(
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
        "La logística se registró, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

async function getLogisticaById(
  logisticaId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<LogisticaRecord | null> {
  const { data, error } = await supabase
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
    .eq("id", logisticaId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    if (esErrorEsquemaLogisticaFaltante(error)) {
      throw new Error(
        "La tabla logisticas_entrega no está disponible para operar la etapa de logística."
      );
    }
    throw new Error(error.message);
  }

  return (data as LogisticaRecord | null) ?? null;
}

export async function executeLogistica(
  command: LogisticaCommand,
  options: ExecuteLogisticaOptions = {}
): Promise<LogisticaResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const logisticaActual =
    command.accion === "actualizar_logistica" && command.logistica_id
      ? await getLogisticaById(command.logistica_id, command.caso_id, supabase)
      : null;

  const validation = validateLogisticaCommand({
    command,
    caso,
    logisticaExiste: !!logisticaActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const payload = buildLogisticaEffectivePayload({
    action: command.accion,
    command,
    previous: logisticaActual,
  });
  const updatePayload =
    command.accion === "actualizar_logistica"
      ? buildLogisticaUpdatePayload(command)
      : null;
  const casePayload = buildCaseSyncPayload(payload, actor, command.payload);
  const cambios = [
    ...buildLogisticaChanges({
      action: command.accion,
      previous: logisticaActual,
      next: payload,
    }),
    ...buildCaseChanges({
      caso,
      casePayload,
    }),
  ];

  let logisticaId = command.logistica_id ?? null;

  if (command.accion === "registrar_logistica") {
    const { data, error } = await supabase
      .from("logisticas_entrega")
      .insert({
        id: crypto.randomUUID(),
        caso_id: command.caso_id,
        ...payload,
      })
      .select("id")
      .single();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: esErrorEsquemaLogisticaFaltante(error)
          ? "logistica_tabla_no_disponible"
          : "logistica_no_guardada",
        mensaje: esErrorEsquemaLogisticaFaltante(error)
          ? "La tabla logisticas_entrega no está disponible para registrar logística."
          : "No se pudo registrar la logística del caso.",
      });
      return result;
    }

    logisticaId = (data as { id: string }).id;
  } else {
    const { data, error } = await supabase
      .from("logisticas_entrega")
      .update(updatePayload ?? {})
      .eq("id", command.logistica_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: esErrorEsquemaLogisticaFaltante(error)
          ? "logistica_tabla_no_disponible"
          : "logistica_no_actualizada",
        mensaje: esErrorEsquemaLogisticaFaltante(error)
          ? "La tabla logisticas_entrega no está disponible para actualizar logística."
          : "No se pudo actualizar la logística del caso.",
      });
      return result;
    }

    if (!(data as { id: string } | null)?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "logistica_no_actualizada",
        mensaje:
          "No se pudo actualizar la logística. Verifica permisos o que pertenezca al caso indicado.",
      });
      return result;
    }
  }

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
        "La logística se registró, pero no se pudo sincronizar la continuidad del caso.",
    });
    result.logistica_id = logisticaId;
    return result;
  }

  if (!(updatedCaso as { id: string } | null)?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_sincronizado",
      mensaje:
        "La logística se registró, pero no se pudo sincronizar la continuidad del caso. Verifica permisos o que el caso exista.",
    });
    result.logistica_id = logisticaId;
    return result;
  }

  result.ok = true;
  result.logistica_id = logisticaId;
  result.cambios = cambios;
  result.advertencias = validation.advertencias;

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
      cambios,
    }),
    result.advertencias,
    supabase
  );

  return result;
}
