import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditoriaChange,
  AuditoriaCommand,
  AuditoriaResult,
} from "./contracts";
import { validateAuditoriaCommand } from "./validators";

type AuditoriaRecord = {
  id: string;
  caso_id: string;
  fecha_auditoria: string | null;
  responsable_auditoria: string | null;
  estado_auditoria: string;
  observaciones_auditoria: string | null;
  conformidad_cliente: boolean | null;
  requiere_correccion: boolean | null;
  fecha_cierre_tecnico: string | null;
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

type ExecuteAuditoriaOptions = {
  supabase?: SupabaseClient;
};

type AuditoriaPayload = {
  fecha_auditoria: string | null;
  responsable_auditoria: string | null;
  estado_auditoria: string | null;
  observaciones_auditoria: string | null;
  conformidad_cliente: boolean | null;
  requiere_correccion: boolean | null;
  fecha_cierre_tecnico: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
};

function crearResultadoBase(command: AuditoriaCommand): AuditoriaResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    auditoria_id: command.auditoria_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.auditoria",
    },
  };
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function payloadTieneCampo(
  payload: AuditoriaCommand["payload"],
  campo: keyof AuditoriaCommand["payload"]
) {
  return Object.prototype.hasOwnProperty.call(payload, campo);
}

function buildAuditoriaPayload(command: AuditoriaCommand): AuditoriaPayload {
  return {
    fecha_auditoria: command.payload.fecha_auditoria ?? null,
    responsable_auditoria:
      normalizarTextoNullable(command.payload.responsable_auditoria) ?? null,
    estado_auditoria: normalizarTextoNullable(command.payload.estado_auditoria) ?? null,
    observaciones_auditoria:
      normalizarTextoNullable(command.payload.observaciones_auditoria) ?? null,
    conformidad_cliente: command.payload.conformidad_cliente ?? null,
    requiere_correccion: command.payload.requiere_correccion ?? null,
    fecha_cierre_tecnico: command.payload.fecha_cierre_tecnico ?? null,
    proxima_accion: command.payload.proxima_accion ?? null,
    proxima_fecha: command.payload.proxima_fecha ?? null,
  };
}

function buildAuditoriaUpdatePayload(
  command: AuditoriaCommand
): Partial<AuditoriaPayload> {
  const payload: Partial<AuditoriaPayload> = {};

  if (payloadTieneCampo(command.payload, "fecha_auditoria")) {
    payload.fecha_auditoria = command.payload.fecha_auditoria ?? null;
  }

  if (payloadTieneCampo(command.payload, "responsable_auditoria")) {
    payload.responsable_auditoria =
      normalizarTextoNullable(command.payload.responsable_auditoria) ?? null;
  }

  if (payloadTieneCampo(command.payload, "estado_auditoria")) {
    payload.estado_auditoria =
      normalizarTextoNullable(command.payload.estado_auditoria) ?? null;
  }

  if (payloadTieneCampo(command.payload, "observaciones_auditoria")) {
    payload.observaciones_auditoria =
      normalizarTextoNullable(command.payload.observaciones_auditoria) ?? null;
  }

  if (payloadTieneCampo(command.payload, "conformidad_cliente")) {
    payload.conformidad_cliente = command.payload.conformidad_cliente ?? null;
  }

  if (payloadTieneCampo(command.payload, "requiere_correccion")) {
    payload.requiere_correccion = command.payload.requiere_correccion ?? null;
  }

  if (payloadTieneCampo(command.payload, "fecha_cierre_tecnico")) {
    payload.fecha_cierre_tecnico = command.payload.fecha_cierre_tecnico ?? null;
  }

  if (payloadTieneCampo(command.payload, "proxima_accion")) {
    payload.proxima_accion = command.payload.proxima_accion ?? null;
  }

  if (payloadTieneCampo(command.payload, "proxima_fecha")) {
    payload.proxima_fecha = command.payload.proxima_fecha ?? null;
  }

  return payload;
}

function buildAuditoriaEffectivePayload(args: {
  action: AuditoriaCommand["accion"];
  command: AuditoriaCommand;
  previous: AuditoriaRecord | null;
}): AuditoriaPayload {
  if (args.action === "registrar_auditoria" || !args.previous) {
    return buildAuditoriaPayload(args.command);
  }

  return {
    fecha_auditoria: args.previous.fecha_auditoria ?? null,
    responsable_auditoria: args.previous.responsable_auditoria ?? null,
    estado_auditoria: args.previous.estado_auditoria ?? null,
    observaciones_auditoria: args.previous.observaciones_auditoria ?? null,
    conformidad_cliente: args.previous.conformidad_cliente ?? null,
    requiere_correccion: args.previous.requiere_correccion ?? null,
    fecha_cierre_tecnico: args.previous.fecha_cierre_tecnico ?? null,
    proxima_accion: args.previous.fecha_auditoria ? null : null,
    proxima_fecha: null,
    ...buildAuditoriaUpdatePayload(args.command),
  };
}

function buildCaseSyncPayload(
  payload: AuditoriaPayload,
  actor: string,
  commandPayload: AuditoriaCommand["payload"]
) {
  const update: Record<string, string | null> = {};

  if (payload.responsable_auditoria) {
    update.responsable_actual = payload.responsable_auditoria;
  }

  const proximaAccionExplicita = payloadTieneCampo(commandPayload, "proxima_accion")
    ? normalizarTextoNullable(commandPayload.proxima_accion) ?? null
    : null;
  const proximaFechaExplicita = payloadTieneCampo(commandPayload, "proxima_fecha")
    ? commandPayload.proxima_fecha ?? null
    : null;

  switch (payload.estado_auditoria) {
    case "pendiente":
    case "en_revision":
    case "con_observaciones":
      update.proxima_accion =
        proximaAccionExplicita ?? "Registrar resultado de auditoría";
      update.proxima_fecha =
        proximaFechaExplicita ?? payload.fecha_auditoria ?? hoyIso();
      break;
    case "requiere_correccion":
      update.proxima_accion =
        proximaAccionExplicita ?? "Gestionar corrección pendiente";
      update.proxima_fecha =
        proximaFechaExplicita ?? payload.fecha_auditoria ?? null;
      break;
    case "conforme":
      update.proxima_accion =
        proximaAccionExplicita ?? "Registrar seguimiento postventa";
      update.proxima_fecha =
        proximaFechaExplicita ?? payload.fecha_cierre_tecnico ?? payload.fecha_auditoria ?? null;
      break;
    case "cerrada":
      update.proxima_accion =
        proximaAccionExplicita ?? "Registrar seguimiento postventa";
      update.proxima_fecha =
        proximaFechaExplicita ?? payload.fecha_cierre_tecnico ?? payload.fecha_auditoria ?? null;
      break;
    default:
      update.proxima_accion =
        proximaAccionExplicita ?? "Registrar resultado de auditoría";
      update.proxima_fecha =
        proximaFechaExplicita ?? payload.fecha_auditoria ?? hoyIso();
      break;
  }

  return update;
}

function buildAuditoriaChanges(args: {
  action: AuditoriaCommand["accion"];
  previous: AuditoriaRecord | null;
  next: AuditoriaPayload;
}): AuditoriaChange[] {
  const { action, previous, next } = args;
  const source: AuditoriaPayload = {
    fecha_auditoria: previous?.fecha_auditoria ?? null,
    responsable_auditoria: previous?.responsable_auditoria ?? null,
    estado_auditoria: previous?.estado_auditoria ?? null,
    observaciones_auditoria: previous?.observaciones_auditoria ?? null,
    conformidad_cliente: previous?.conformidad_cliente ?? null,
    requiere_correccion: previous?.requiere_correccion ?? null,
    fecha_cierre_tecnico: previous?.fecha_cierre_tecnico ?? null,
    proxima_accion: null,
    proxima_fecha: null,
  };

  const campos: Array<keyof AuditoriaPayload> = [
    "fecha_auditoria",
    "responsable_auditoria",
    "estado_auditoria",
    "observaciones_auditoria",
    "conformidad_cliente",
    "requiere_correccion",
    "fecha_cierre_tecnico",
  ];

  return campos
    .filter((campo) => action === "registrar_auditoria" || source[campo] !== next[campo])
    .map((campo) => ({
      campo: `auditoria.${campo}`,
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
  actor: string;
}): AuditoriaChange[] {
  const { caso, casePayload, actor } = args;
  if (!caso) return [];

  const cambios: AuditoriaChange[] = [];

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
    (caso.metadata.estado_tecnico_real ?? "") !==
      (casePayload.responsable_actual ?? "")
  ) {
    cambios.push({
      campo: "responsable_actual",
      anterior: caso.metadata.estado_tecnico_real,
      nuevo: casePayload.responsable_actual,
    });
  }

  if (actor) {
    cambios.push({
      campo: "auditoria_por",
      anterior: null,
      nuevo: actor,
    });
  }

  return cambios;
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: AuditoriaChange[];
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
        "La auditoría se guardó, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

async function getAuditoriaById(
  auditoriaId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<AuditoriaRecord | null> {
  const { data, error } = await supabase
    .from("auditorias")
    .select(
      `
      id,
      caso_id,
      fecha_auditoria,
      responsable_auditoria,
      estado_auditoria,
      observaciones_auditoria,
      conformidad_cliente,
      requiere_correccion,
      fecha_cierre_tecnico,
      created_at,
      updated_at
    `)
    .eq("id", auditoriaId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AuditoriaRecord | null) ?? null;
}

export async function executeAuditoria(
  command: AuditoriaCommand,
  options: ExecuteAuditoriaOptions = {}
): Promise<AuditoriaResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const auditoriaActual =
    command.accion === "actualizar_auditoria" && command.auditoria_id
      ? await getAuditoriaById(command.auditoria_id, command.caso_id, supabase)
      : null;

  const validation = validateAuditoriaCommand({
    command,
    caso,
    auditoriaExiste: !!auditoriaActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const auditoriaPayload = buildAuditoriaEffectivePayload({
    action: command.accion,
    command,
    previous: auditoriaActual,
  });
  const auditoriaUpdatePayload =
    command.accion === "actualizar_auditoria"
      ? buildAuditoriaUpdatePayload(command)
      : null;
  const casePayload = buildCaseSyncPayload(
    auditoriaPayload,
    actor,
    command.payload
  );
  const auditoriaCambios = buildAuditoriaChanges({
    action: command.accion,
    previous: auditoriaActual,
    next: auditoriaPayload,
  });
  const caseCambios = buildCaseChanges({
    caso,
    casePayload,
    actor,
  });

  let auditoriaId = command.auditoria_id ?? null;
  if (command.accion === "registrar_auditoria") {
    const { data, error } = await supabase
      .from("auditorias")
      .insert({
        caso_id: command.caso_id,
        fecha_auditoria: auditoriaPayload.fecha_auditoria,
        responsable_auditoria: auditoriaPayload.responsable_auditoria,
        estado_auditoria: auditoriaPayload.estado_auditoria || "pendiente",
        observaciones_auditoria: auditoriaPayload.observaciones_auditoria,
        conformidad_cliente: auditoriaPayload.conformidad_cliente,
        requiere_correccion: auditoriaPayload.requiere_correccion ?? false,
        fecha_cierre_tecnico: auditoriaPayload.fecha_cierre_tecnico,
      })
      .select("id")
      .single();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "auditoria_no_guardada",
        mensaje: `No se pudo registrar la auditoría${error.message ? `: ${error.message}` : "."}`,
      });
      return result;
    }

    auditoriaId = (data as { id: string }).id;
  } else {
    const { data: updatedAuditoria, error } = await supabase
      .from("auditorias")
      .update(auditoriaUpdatePayload ?? {})
      .eq("id", command.auditoria_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "auditoria_no_actualizada",
        mensaje: `No se pudo actualizar la auditoría${error.message ? `: ${error.message}` : "."}`,
      });
      return result;
    }

    if (!updatedAuditoria?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "auditoria_no_actualizada",
        mensaje:
          "No se pudo actualizar la auditoría. Verifica permisos o que pertenezca al caso indicado.",
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
      mensaje: `La auditoría se registró, pero no se pudo sincronizar la continuidad del caso${casoError.message ? `: ${casoError.message}` : "."}`,
    });
    result.auditoria_id = auditoriaId;
    return result;
  }

  if (!updatedCaso?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_sincronizado",
      mensaje:
        "La auditoría se registró, pero no se pudo sincronizar la continuidad del caso. Verifica permisos o que el caso exista.",
    });
    result.auditoria_id = auditoriaId;
    return result;
  }

  result.ok = true;
  result.auditoria_id = auditoriaId;
  result.cambios = [...auditoriaCambios, ...caseCambios];
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
