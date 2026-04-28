import { createServerSupabaseClient } from "@/lib/supabase/server";
import { esErrorEsquemaSeguimientoComercialFaltante } from "@/core/application/casos/adapter/seguimientoComercialCompat";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { registerWorkflowTransitions } from "@/core/application/casos/workflow/registerWorkflowTransitions";
import type {
  SeguimientoChange,
  SeguimientoCommand,
  SeguimientoResult,
} from "./contracts";
import {
  derivarSeguimientoComercial,
  labelSenalComercial,
} from "./comercial";
import { validateSeguimientoCommand } from "./validators";

type SeguimientoRecord = {
  id: string;
  caso_id: string;
  fecha: string | null;
  tipo_seguimiento: string | null;
  resultado: string | null;
  proximo_paso: string | null;
  proxima_fecha: string | null;
  estado_comercial: string | null;
  senales_comerciales: string[] | null;
  observaciones_cliente: string | null;
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

function omitirSenalesComerciales<T extends { senales_comerciales?: unknown }>(
  payload: T
): Omit<T, "senales_comerciales"> {
  const { senales_comerciales: senalesComercialesOmitidas, ...rest } = payload;
  void senalesComercialesOmitidas;
  return rest;
}

type ExecuteSeguimientoOptions = {
  supabase?: SupabaseClient;
};

type SeguimientoPayload = {
  tipo_seguimiento: string | null;
  resultado: string | null;
  proximo_paso: string | null;
  proxima_fecha: string | null;
  estado_comercial: string | null;
  senales_comerciales: string[];
  observaciones_cliente: string | null;
};

function crearResultadoBase(command: SeguimientoCommand): SeguimientoResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    seguimiento_id: command.seguimiento_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.seguimiento",
    },
  };
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function payloadTieneCampo(
  payload: SeguimientoCommand["payload"],
  campo: keyof SeguimientoCommand["payload"]
) {
  return Object.prototype.hasOwnProperty.call(payload, campo);
}

function buildWorkflowTransitionInputs(args: {
  casoId: string;
  seguimientoId: string | null;
  actor: string;
  metadataOrigin: string;
  seguimientoPayload: SeguimientoPayload;
}) {
  const estadoComercial = normalizarTextoNullable(
    args.seguimientoPayload.estado_comercial
  );

  if (estadoComercial === "aprobado") {
    return [
      {
        caso_id: args.casoId,
        transition_code: "cliente_aprobo" as const,
        from_stage: "gestion_comercial" as const,
        to_stage: "logistica_entrega" as const,
        actor: args.actor,
        origin: args.metadataOrigin,
        occurred_at: undefined,
        observacion:
          normalizarTextoNullable(args.seguimientoPayload.resultado) ?? null,
        evidencia_ref: args.seguimientoId,
      },
    ];
  }

  if (estadoComercial === "rechazado") {
    const observacion =
      normalizarTextoNullable(args.seguimientoPayload.resultado) ??
      normalizarTextoNullable(args.seguimientoPayload.observaciones_cliente) ??
      null;

    return [
      {
        caso_id: args.casoId,
        transition_code: "cliente_rechazo" as const,
        from_stage: "gestion_comercial" as const,
        to_stage: "gestion_comercial" as const,
        actor: args.actor,
        origin: args.metadataOrigin,
        occurred_at: undefined,
        observacion,
        evidencia_ref: args.seguimientoId,
      },
      {
        caso_id: args.casoId,
        transition_code: "cierre_sin_conversion" as const,
        from_stage: "gestion_comercial" as const,
        to_stage: "cerrado" as const,
        actor: args.actor,
        origin: args.metadataOrigin,
        occurred_at: undefined,
        observacion,
        evidencia_ref: args.seguimientoId,
      },
    ];
  }

  return [];
}

function buildSeguimientoPayload(command: SeguimientoCommand): SeguimientoPayload {
  const lecturaComercial = derivarSeguimientoComercial({
    estadoComercial: command.payload.estado_comercial,
    senalesComerciales: command.payload.senales_comerciales ?? [],
  });

  return {
    tipo_seguimiento:
      normalizarTextoNullable(command.payload.tipo_seguimiento) ?? null,
    resultado: normalizarTextoNullable(command.payload.resultado) ?? null,
    proximo_paso:
      normalizarTextoNullable(command.payload.proximo_paso) ?? null,
    proxima_fecha: command.payload.proxima_fecha ?? null,
    estado_comercial: lecturaComercial.estado_principal,
    senales_comerciales: lecturaComercial.senales_comerciales,
    observaciones_cliente:
      normalizarTextoNullable(command.payload.observaciones_cliente) ?? null,
  };
}

function buildSeguimientoUpdatePayload(
  command: SeguimientoCommand,
  previous: SeguimientoRecord | null
): Partial<SeguimientoPayload> {
  const payload: Partial<SeguimientoPayload> = {};

  if (payloadTieneCampo(command.payload, "tipo_seguimiento")) {
    payload.tipo_seguimiento =
      normalizarTextoNullable(command.payload.tipo_seguimiento) ?? null;
  }

  if (payloadTieneCampo(command.payload, "resultado")) {
    payload.resultado = normalizarTextoNullable(command.payload.resultado) ?? null;
  }

  if (payloadTieneCampo(command.payload, "proximo_paso")) {
    payload.proximo_paso =
      normalizarTextoNullable(command.payload.proximo_paso) ?? null;
  }

  if (payloadTieneCampo(command.payload, "proxima_fecha")) {
    payload.proxima_fecha = command.payload.proxima_fecha ?? null;
  }

  if (
    payloadTieneCampo(command.payload, "estado_comercial") ||
    payloadTieneCampo(command.payload, "senales_comerciales")
  ) {
    const estadoExplicito = payloadTieneCampo(command.payload, "estado_comercial")
      ? command.payload.estado_comercial ?? null
      : previous?.estado_comercial ?? null;
    const senalesBase = payloadTieneCampo(command.payload, "senales_comerciales")
      ? command.payload.senales_comerciales ?? []
      : ["aprobado", "rechazado"].includes(estadoExplicito ?? "")
        ? []
        : previous?.senales_comerciales ?? [];
    const lecturaComercial = derivarSeguimientoComercial({
      estadoComercial: estadoExplicito,
      senalesComerciales: senalesBase,
    });

    payload.estado_comercial = lecturaComercial.estado_principal;
    payload.senales_comerciales = lecturaComercial.senales_comerciales;
  }

  if (payloadTieneCampo(command.payload, "observaciones_cliente")) {
    payload.observaciones_cliente =
      normalizarTextoNullable(command.payload.observaciones_cliente) ?? null;
  }

  return payload;
}

function buildSeguimientoEffectivePayload(args: {
  action: SeguimientoCommand["accion"];
  command: SeguimientoCommand;
  previous: SeguimientoRecord | null;
}): SeguimientoPayload {
  if (args.action === "registrar_seguimiento" || !args.previous) {
    return buildSeguimientoPayload(args.command);
  }

  return {
    tipo_seguimiento: args.previous.tipo_seguimiento ?? null,
    resultado: args.previous.resultado ?? null,
    proximo_paso: args.previous.proximo_paso ?? null,
    proxima_fecha: args.previous.proxima_fecha ?? null,
    estado_comercial: args.previous.estado_comercial ?? null,
    senales_comerciales: args.previous.senales_comerciales ?? [],
    observaciones_cliente: args.previous.observaciones_cliente ?? null,
    ...buildSeguimientoUpdatePayload(args.command, args.previous),
  };
}

function buildCaseSyncPayload(
  seguimientoPayload: SeguimientoPayload,
  actor: string,
  commandPayload: SeguimientoCommand["payload"]
) {
  const payload: Record<string, string | null> = {
    seguimiento_por: actor,
  };

  if (seguimientoPayload.estado_comercial === "rechazado") {
    const proximoPasoExplicito = payloadTieneCampo(commandPayload, "proximo_paso")
      ? normalizarTextoNullable(commandPayload.proximo_paso) ?? null
      : null;

    payload.estado_comercial = "rechazado";
    payload.proxima_accion = proximoPasoExplicito ?? "Confirmar cierre del caso";
    payload.proxima_fecha = payloadTieneCampo(commandPayload, "proxima_fecha")
      ? commandPayload.proxima_fecha ?? null
      : null;

    return payload;
  }

  if (seguimientoPayload.estado_comercial === "aprobado") {
    const proximoPasoExplicito = payloadTieneCampo(commandPayload, "proximo_paso")
      ? normalizarTextoNullable(commandPayload.proximo_paso) ?? null
      : null;

    payload.estado_comercial = "aprobado";
    payload.proxima_accion =
      proximoPasoExplicito ?? "Coordinar ejecución o entrega";
    payload.proxima_fecha = payloadTieneCampo(commandPayload, "proxima_fecha")
      ? commandPayload.proxima_fecha ?? null
      : null;

    return payload;
  }

  if (seguimientoPayload.proximo_paso) {
    payload.proxima_accion = seguimientoPayload.proximo_paso;
  }

  if (seguimientoPayload.proxima_fecha) {
    payload.proxima_fecha = seguimientoPayload.proxima_fecha;
  }

  if (seguimientoPayload.estado_comercial) {
    payload.estado_comercial = seguimientoPayload.estado_comercial;
  }

  return payload;
}

function buildCaseChanges(args: {
  caso: Awaited<ReturnType<typeof getCasoNormalizadoById>>;
  casePayload: Record<string, string | null>;
  actor: string;
}): SeguimientoChange[] {
  const { caso, casePayload, actor } = args;
  if (!caso) return [];

  const cambios: SeguimientoChange[] = [];

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
    Object.prototype.hasOwnProperty.call(casePayload, "estado_comercial") &&
    (caso.metadata.estado_comercial_real ?? "") !==
      (casePayload.estado_comercial ?? "")
  ) {
    cambios.push({
      campo: "estado_comercial",
      anterior: caso.metadata.estado_comercial_real,
      nuevo: casePayload.estado_comercial,
    });
  }

  if (caso.metadata.origen || actor) {
    cambios.push({
      campo: "seguimiento_por",
      anterior: null,
      nuevo: actor,
    });
  }

  return cambios;
}

function buildSeguimientoChanges(args: {
  action: SeguimientoCommand["accion"];
  previous: SeguimientoRecord | null;
  next: ReturnType<typeof buildSeguimientoPayload>;
}): SeguimientoChange[] {
  const { action, previous, next } = args;
  const source = previous ?? {
    tipo_seguimiento: null,
    resultado: null,
    proximo_paso: null,
    proxima_fecha: null,
    estado_comercial: null,
    senales_comerciales: [],
    observaciones_cliente: null,
  };

  const campos: Array<keyof ReturnType<typeof buildSeguimientoPayload>> = [
    "tipo_seguimiento",
    "resultado",
    "proximo_paso",
    "proxima_fecha",
    "estado_comercial",
    "senales_comerciales",
    "observaciones_cliente",
  ];

  const valoresIguales = (
    anterior: string | string[] | null,
    nuevo: string | string[] | null
  ) => {
    if (Array.isArray(anterior) || Array.isArray(nuevo)) {
      const listaAnterior = Array.isArray(anterior) ? anterior : [];
      const listaNueva = Array.isArray(nuevo) ? nuevo : [];
      return listaAnterior.join("||") === listaNueva.join("||");
    }

    return (anterior ?? null) === (nuevo ?? null);
  };

  return campos
    .filter(
      (campo) =>
        action === "registrar_seguimiento" ||
        !valoresIguales(
          source[campo] as string | string[] | null,
          next[campo] as string | string[] | null
        )
    )
    .map((campo) => ({
      campo: `seguimiento.${campo}`,
      anterior: Array.isArray(source[campo])
        ? source[campo].map(labelSenalComercial).join(", ")
        : source[campo] ?? null,
      nuevo: Array.isArray(next[campo])
        ? next[campo].map(labelSenalComercial).join(", ")
        : next[campo] ?? null,
    }));
}

async function resolveMissingWorkflowTransitions(args: {
  casoId: string;
  inputs: ReturnType<typeof buildWorkflowTransitionInputs>;
  supabase: SupabaseClient;
}) {
  if (args.inputs.length === 0) {
    return {
      ok: true as const,
      missing: [] as ReturnType<typeof buildWorkflowTransitionInputs>,
      inserted: false,
    };
  }

  const { data, error } = await args.supabase
    .from("workflow_transitions")
    .select("transition_code")
    .eq("caso_id", args.casoId);

  if (error) {
    return {
      ok: false as const,
      message: error.message,
    };
  }

  const existentes = new Set(
    (((data as Array<{ transition_code: string }> | null) ?? []) as Array<{
      transition_code: string;
    }>).map((row) => row.transition_code)
  );
  const missing = args.inputs.filter(
    (input) => !existentes.has(input.transition_code)
  );

  if (missing.length === 0) {
    return {
      ok: true as const,
      missing,
      inserted: false,
    };
  }

  const registered = await registerWorkflowTransitions(missing, args.supabase);
  if (!registered.ok) {
    return registered;
  }

  return {
    ok: true as const,
    missing,
    inserted: true,
  };
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: SeguimientoChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) =>
      ["proxima_accion", "proxima_fecha", "estado_comercial", "seguimiento_por"].includes(
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
        "El seguimiento se registró, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

async function getSeguimientoById(
  seguimientoId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<SeguimientoRecord | null> {
  const { data, error } = await supabase
    .from("seguimientos")
    .select(`
      id,
      caso_id,
      fecha,
      tipo_seguimiento,
      resultado,
      proximo_paso,
      proxima_fecha,
      estado_comercial,
      senales_comerciales,
      observaciones_cliente,
      created_at
    `)
    .eq("id", seguimientoId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as SeguimientoRecord | null) ?? null;
}

export async function executeSeguimiento(
  command: SeguimientoCommand,
  options: ExecuteSeguimientoOptions = {}
): Promise<SeguimientoResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const seguimientoActual =
    command.accion === "actualizar_seguimiento" && command.seguimiento_id
      ? await getSeguimientoById(command.seguimiento_id, command.caso_id, supabase)
      : null;

  const validation = validateSeguimientoCommand({
    command,
    caso,
    seguimientoExiste: !!seguimientoActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const seguimientoPayload = buildSeguimientoEffectivePayload({
    action: command.accion,
    command,
    previous: seguimientoActual,
  });
  const seguimientoUpdatePayload =
    command.accion === "actualizar_seguimiento"
      ? buildSeguimientoUpdatePayload(command, seguimientoActual)
      : null;
  const casePayload = buildCaseSyncPayload(
    seguimientoPayload,
    actor,
    command.payload
  );
  const seguimientoCambios = buildSeguimientoChanges({
    action: command.accion,
    previous: seguimientoActual,
    next: seguimientoPayload,
  });
  const caseCambios = buildCaseChanges({
    caso,
    casePayload,
    actor,
  });

  let seguimientoId = command.seguimiento_id ?? null;
  if (command.accion === "registrar_seguimiento") {
    let insertResult = await supabase
      .from("seguimientos")
      .insert({
        caso_id: command.caso_id,
        fecha: hoyIso(),
        ...seguimientoPayload,
      })
      .select("id")
      .single();

    if (
      insertResult.error &&
      esErrorEsquemaSeguimientoComercialFaltante(insertResult.error)
    ) {
      insertResult = await supabase
        .from("seguimientos")
        .insert({
          caso_id: command.caso_id,
          fecha: hoyIso(),
          ...omitirSenalesComerciales(seguimientoPayload),
        })
        .select("id")
        .single();
    }

    const { data, error } = insertResult;

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "seguimiento_no_guardado",
        mensaje: "No se pudo registrar el seguimiento.",
      });
      return result;
    }

    seguimientoId = (data as { id: string }).id;
  } else {
    let updateResult = await supabase
      .from("seguimientos")
      .update(seguimientoUpdatePayload ?? {})
      .eq("id", command.seguimiento_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (
      updateResult.error &&
      seguimientoUpdatePayload &&
      esErrorEsquemaSeguimientoComercialFaltante(updateResult.error)
    ) {
      updateResult = await supabase
        .from("seguimientos")
        .update(omitirSenalesComerciales(seguimientoUpdatePayload))
        .eq("id", command.seguimiento_id)
        .eq("caso_id", command.caso_id)
        .select("id")
        .maybeSingle();
    }

    const { data: updatedSeguimiento, error } = updateResult;

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "seguimiento_no_actualizado",
        mensaje: "No se pudo actualizar el seguimiento.",
      });
      return result;
    }

    if (!updatedSeguimiento?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "seguimiento_no_actualizado",
        mensaje:
          "No se pudo actualizar el seguimiento. Verifica permisos o que pertenezca al caso indicado.",
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
        "El seguimiento se registró, pero no se pudo sincronizar la continuidad del caso.",
    });
    result.seguimiento_id = seguimientoId;
    return result;
  }

  if (!updatedCaso?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_sincronizado",
      mensaje:
        "El seguimiento se registró, pero no se pudo sincronizar la continuidad del caso. Verifica permisos o que el caso exista.",
    });
    result.seguimiento_id = seguimientoId;
    return result;
  }

  result.ok = true;
  result.seguimiento_id = seguimientoId;
  result.cambios = [...seguimientoCambios, ...caseCambios];
  result.advertencias = validation.advertencias;

  const workflowTransitionInputs = buildWorkflowTransitionInputs({
    casoId: command.caso_id,
    seguimientoId,
    actor,
    metadataOrigin: result.metadata.origen,
    seguimientoPayload,
  });

  if (workflowTransitionInputs.length > 0) {
    const workflowTransitionResult = await resolveMissingWorkflowTransitions({
      casoId: command.caso_id,
      inputs: workflowTransitionInputs,
      supabase,
    });

    if (!workflowTransitionResult.ok) {
      result.ok = false;
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "workflow_transition_no_registrada",
        mensaje: `El seguimiento se guardó, pero no se pudo persistir la transición formal del workflow. ${workflowTransitionResult.message}`,
      });
      return result;
    }

    if (workflowTransitionResult.inserted) {
      result.advertencias.push({
        caso_id: command.caso_id,
        codigo: "workflow_transition_backfilled",
        mensaje:
          "Se registraron las transiciones formales faltantes del workflow para sostener el cierre comercial.",
      });
    }
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
