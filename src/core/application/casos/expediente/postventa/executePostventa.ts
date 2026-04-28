import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import { registerWorkflowTransitions } from "@/core/application/casos/workflow/registerWorkflowTransitions";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PostventaChange,
  PostventaCommand,
  PostventaResult,
} from "./contracts";
import { validatePostventaCommand } from "./validators";

type PostventaRecord = {
  id: string;
  caso_id: string;
  fecha_postventa: string | null;
  estado_postventa: string;
  observacion_postventa: string | null;
  requiere_accion: boolean | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  conformidad_final: boolean | null;
  responsable_postventa: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecutePostventaOptions = {
  supabase?: SupabaseClient;
};

type PostventaPayload = {
  fecha_postventa: string | null;
  estado_postventa: string | null;
  observacion_postventa: string | null;
  requiere_accion: boolean | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  conformidad_final: boolean | null;
  responsable_postventa: string | null;
  notas: string | null;
};

function crearResultadoBase(command: PostventaCommand): PostventaResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    postventa_id: command.postventa_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.postventa",
    },
  };
}

function hoyIso() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function payloadTieneCampo(
  payload: PostventaCommand["payload"],
  campo: keyof PostventaCommand["payload"]
) {
  return Object.prototype.hasOwnProperty.call(payload, campo);
}

function buildPostventaPayload(command: PostventaCommand): PostventaPayload {
  return {
    fecha_postventa: command.payload.fecha_postventa ?? null,
    estado_postventa: normalizarTextoNullable(command.payload.estado_postventa) ?? null,
    observacion_postventa:
      normalizarTextoNullable(command.payload.observacion_postventa) ?? null,
    requiere_accion: command.payload.requiere_accion ?? null,
    proxima_accion: normalizarTextoNullable(command.payload.proxima_accion) ?? null,
    proxima_fecha: command.payload.proxima_fecha ?? null,
    conformidad_final: command.payload.conformidad_final ?? null,
    responsable_postventa:
      normalizarTextoNullable(command.payload.responsable_postventa) ?? null,
    notas: normalizarTextoNullable(command.payload.notas) ?? null,
  };
}

function buildPostventaUpdatePayload(
  command: PostventaCommand
): Partial<PostventaPayload> {
  const payload: Partial<PostventaPayload> = {};

  if (payloadTieneCampo(command.payload, "fecha_postventa")) {
    payload.fecha_postventa = command.payload.fecha_postventa ?? null;
  }
  if (payloadTieneCampo(command.payload, "estado_postventa")) {
    payload.estado_postventa =
      normalizarTextoNullable(command.payload.estado_postventa) ?? null;
  }
  if (payloadTieneCampo(command.payload, "observacion_postventa")) {
    payload.observacion_postventa =
      normalizarTextoNullable(command.payload.observacion_postventa) ?? null;
  }
  if (payloadTieneCampo(command.payload, "requiere_accion")) {
    payload.requiere_accion = command.payload.requiere_accion ?? null;
  }
  if (payloadTieneCampo(command.payload, "proxima_accion")) {
    payload.proxima_accion =
      normalizarTextoNullable(command.payload.proxima_accion) ?? null;
  }
  if (payloadTieneCampo(command.payload, "proxima_fecha")) {
    payload.proxima_fecha = command.payload.proxima_fecha ?? null;
  }
  if (payloadTieneCampo(command.payload, "conformidad_final")) {
    payload.conformidad_final = command.payload.conformidad_final ?? null;
  }
  if (payloadTieneCampo(command.payload, "responsable_postventa")) {
    payload.responsable_postventa =
      normalizarTextoNullable(command.payload.responsable_postventa) ?? null;
  }
  if (payloadTieneCampo(command.payload, "notas")) {
    payload.notas = normalizarTextoNullable(command.payload.notas) ?? null;
  }

  return payload;
}

function buildPostventaEffectivePayload(args: {
  action: PostventaCommand["accion"];
  command: PostventaCommand;
  previous: PostventaRecord | null;
}): PostventaPayload {
  if (args.action === "registrar_postventa" || !args.previous) {
    return buildPostventaPayload(args.command);
  }

  return {
    fecha_postventa: args.previous.fecha_postventa ?? null,
    estado_postventa: args.previous.estado_postventa ?? null,
    observacion_postventa: args.previous.observacion_postventa ?? null,
    requiere_accion: args.previous.requiere_accion ?? null,
    proxima_accion: args.previous.proxima_accion ?? null,
    proxima_fecha: args.previous.proxima_fecha ?? null,
    conformidad_final: args.previous.conformidad_final ?? null,
    responsable_postventa: args.previous.responsable_postventa ?? null,
    notas: args.previous.notas ?? null,
    ...buildPostventaUpdatePayload(args.command),
  };
}

function buildCaseSyncPayload(
  payload: PostventaPayload,
  commandPayload: PostventaCommand["payload"]
) {
  const update: Record<string, string | null> = {};

  if (payload.responsable_postventa) {
    update.responsable_actual = payload.responsable_postventa;
  }

  const proximaAccionExplicita = payloadTieneCampo(commandPayload, "proxima_accion")
    ? normalizarTextoNullable(commandPayload.proxima_accion) ?? null
    : null;
  const proximaFechaExplicita = payloadTieneCampo(commandPayload, "proxima_fecha")
    ? commandPayload.proxima_fecha ?? null
    : null;

  if (
    ["resuelta", "cerrada"].includes(payload.estado_postventa ?? "") &&
    payload.conformidad_final === true &&
    payload.requiere_accion !== true
  ) {
    update.proxima_accion = proximaAccionExplicita ?? "Cerrar técnicamente el caso";
    update.proxima_fecha =
      proximaFechaExplicita ?? payload.proxima_fecha ?? payload.fecha_postventa ?? null;
    return update;
  }

  if (payload.requiere_accion === true || payload.estado_postventa === "requiere_accion") {
    update.proxima_accion =
      proximaAccionExplicita ?? payload.proxima_accion ?? "Gestionar acción postventa pendiente";
    update.proxima_fecha =
      proximaFechaExplicita ?? payload.proxima_fecha ?? payload.fecha_postventa ?? hoyIso();
    return update;
  }

  update.proxima_accion =
    proximaAccionExplicita ?? payload.proxima_accion ?? "Dar seguimiento postventa";
  update.proxima_fecha =
    proximaFechaExplicita ?? payload.proxima_fecha ?? payload.fecha_postventa ?? hoyIso();

  return update;
}

function buildPostventaChanges(args: {
  action: PostventaCommand["accion"];
  previous: PostventaRecord | null;
  next: PostventaPayload;
}): PostventaChange[] {
  const source: PostventaPayload = {
    fecha_postventa: args.previous?.fecha_postventa ?? null,
    estado_postventa: args.previous?.estado_postventa ?? null,
    observacion_postventa: args.previous?.observacion_postventa ?? null,
    requiere_accion: args.previous?.requiere_accion ?? null,
    proxima_accion: args.previous?.proxima_accion ?? null,
    proxima_fecha: args.previous?.proxima_fecha ?? null,
    conformidad_final: args.previous?.conformidad_final ?? null,
    responsable_postventa: args.previous?.responsable_postventa ?? null,
    notas: args.previous?.notas ?? null,
  };

  const campos: Array<keyof PostventaPayload> = [
    "fecha_postventa",
    "estado_postventa",
    "observacion_postventa",
    "requiere_accion",
    "proxima_accion",
    "proxima_fecha",
    "conformidad_final",
    "responsable_postventa",
    "notas",
  ];

  return campos
    .filter((campo) => args.action === "registrar_postventa" || source[campo] !== args.next[campo])
    .map((campo) => ({
      campo: `postventa.${campo}`,
      anterior:
        typeof source[campo] === "boolean"
          ? source[campo]
            ? "true"
            : "false"
          : (source[campo] as string | null) ?? null,
      nuevo:
        typeof args.next[campo] === "boolean"
          ? args.next[campo]
            ? "true"
            : "false"
          : (args.next[campo] as string | null) ?? null,
    }));
}

function buildCaseChanges(args: {
  caso: Awaited<ReturnType<typeof getCasoNormalizadoById>>;
  casePayload: Record<string, string | null>;
}): PostventaChange[] {
  const { caso, casePayload } = args;
  if (!caso) return [];

  const cambios: PostventaChange[] = [];

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

  return cambios;
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: PostventaChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) => ["proxima_accion", "proxima_fecha"].includes(cambio.campo))
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
        "La postventa se guardó, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

async function getPostventaById(
  postventaId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<PostventaRecord | null> {
  const { data, error } = await supabase
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
      created_at,
      updated_at
    `)
    .eq("id", postventaId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as PostventaRecord | null) ?? null;
}

async function getExistingTransitionCodes(
  casoId: string,
  supabase: SupabaseClient
) {
  const { data, error } = await supabase
    .from("workflow_transitions")
    .select("transition_code")
    .eq("caso_id", casoId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set(
    ((data as Array<{ transition_code: string }> | null) ?? []).map(
      (row) => row.transition_code
    )
  );
}

function buildWorkflowTransitionInputs(args: {
  casoId: string;
  postventaId: string;
  actor: string;
  metadataOrigin: string;
  payload: PostventaPayload;
  existingTransitionCodes: Set<string>;
}) {
  const rows: Array<Parameters<typeof registerWorkflowTransitions>[0][number]> = [];

  if (!args.existingTransitionCodes.has("postventa_abierta")) {
    rows.push({
      caso_id: args.casoId,
      transition_code: "postventa_abierta",
      from_stage: "auditoria",
      to_stage: "postventa",
      actor: args.actor,
      origin: args.metadataOrigin,
      observacion:
        args.payload.observacion_postventa ??
        args.payload.estado_postventa ??
        "Se registra formalmente la etapa de postventa.",
      evidencia_ref: args.postventaId,
    });
  }

  if (
    !args.existingTransitionCodes.has("cierre_tecnico_habilitado") &&
    ["resuelta", "cerrada"].includes(args.payload.estado_postventa ?? "") &&
    args.payload.conformidad_final === true &&
    args.payload.requiere_accion !== true
  ) {
    rows.push({
      caso_id: args.casoId,
      transition_code: "cierre_tecnico_habilitado",
      from_stage: "postventa",
      to_stage: "cierre_tecnico",
      actor: args.actor,
      origin: args.metadataOrigin,
      observacion:
        args.payload.observacion_postventa ??
        "La postventa quedó resuelta y habilita el cierre técnico.",
      evidencia_ref: args.postventaId,
    });
  }

  return rows;
}

export async function executePostventa(
  command: PostventaCommand,
  options: ExecutePostventaOptions = {}
): Promise<PostventaResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const postventaActual =
    command.accion === "actualizar_postventa" && command.postventa_id
      ? await getPostventaById(command.postventa_id, command.caso_id, supabase)
      : null;

  const validation = validatePostventaCommand({
    command,
    caso,
    postventaExiste: !!postventaActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const postventaPayload = buildPostventaEffectivePayload({
    action: command.accion,
    command,
    previous: postventaActual,
  });
  const postventaUpdatePayload =
    command.accion === "actualizar_postventa"
      ? buildPostventaUpdatePayload(command)
      : null;
  const casePayload = buildCaseSyncPayload(postventaPayload, command.payload);
  const postventaCambios = buildPostventaChanges({
    action: command.accion,
    previous: postventaActual,
    next: postventaPayload,
  });
  const caseCambios = buildCaseChanges({
    caso,
    casePayload,
  });

  let postventaId = command.postventa_id ?? null;
  if (command.accion === "registrar_postventa") {
    const { data, error } = await supabase
      .from("postventas")
      .insert({
        caso_id: command.caso_id,
        fecha_postventa: postventaPayload.fecha_postventa,
        estado_postventa: postventaPayload.estado_postventa ?? "abierta",
        observacion_postventa: postventaPayload.observacion_postventa,
        requiere_accion: postventaPayload.requiere_accion ?? false,
        proxima_accion: postventaPayload.proxima_accion,
        proxima_fecha: postventaPayload.proxima_fecha,
        conformidad_final: postventaPayload.conformidad_final,
        responsable_postventa: postventaPayload.responsable_postventa,
        notas: postventaPayload.notas,
      })
      .select("id")
      .single();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "postventa_no_guardada",
        mensaje: `No se pudo registrar la postventa${error.message ? `: ${error.message}` : "."}`,
      });
      return result;
    }

    postventaId = (data as { id: string }).id;
  } else {
    const { data: updatedPostventa, error } = await supabase
      .from("postventas")
      .update(postventaUpdatePayload ?? {})
      .eq("id", command.postventa_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "postventa_no_actualizada",
        mensaje: `No se pudo actualizar la postventa${error.message ? `: ${error.message}` : "."}`,
      });
      return result;
    }

    if (!updatedPostventa?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "postventa_no_actualizada",
        mensaje:
          "No se pudo actualizar la postventa. Verifica permisos o que pertenezca al caso indicado.",
      });
      return result;
    }
  }

  const existingTransitionCodes = await getExistingTransitionCodes(
    command.caso_id,
    supabase
  );
  const workflowTransitions = buildWorkflowTransitionInputs({
    casoId: command.caso_id,
    postventaId: postventaId ?? "",
    actor,
    metadataOrigin: result.metadata.origen,
    payload: postventaPayload,
    existingTransitionCodes,
  });
  const workflowTransitionsResult = await registerWorkflowTransitions(
    workflowTransitions,
    supabase
  );

  if (!workflowTransitionsResult.ok) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "workflow_transition_no_registrada",
      mensaje: workflowTransitionsResult.message,
    });
    result.postventa_id = postventaId;
    return result;
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
      mensaje: `La postventa se registró, pero no se pudo sincronizar la continuidad del caso${casoError.message ? `: ${casoError.message}` : "."}`,
    });
    result.postventa_id = postventaId;
    return result;
  }

  if (!updatedCaso?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_sincronizado",
      mensaje:
        "La postventa se registró, pero no se pudo sincronizar la continuidad del caso. Verifica permisos o que el caso exista.",
    });
    result.postventa_id = postventaId;
    return result;
  }

  result.ok = true;
  result.postventa_id = postventaId;
  result.cambios = [...postventaCambios, ...caseCambios];
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
      cambios: caseCambios,
    }),
    result.advertencias,
    supabase
  );

  return result;
}
