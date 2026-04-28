import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import { registerWorkflowTransitions } from "@/core/application/casos/workflow/registerWorkflowTransitions";
import { esErrorEsquemaCierreTecnicoFaltante } from "@/core/application/casos/adapter/cierreTecnicoCompat";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CierreTecnicoChange,
  CierreTecnicoCommand,
  CierreTecnicoResult,
} from "./contracts";
import { validateCierreTecnicoCommand } from "./validators";

type CierreTecnicoRecord = {
  id: string;
  caso_id: string;
  fecha_cierre_tecnico: string | null;
  responsable_cierre: string | null;
  motivo_cierre: string | null;
  observacion_cierre: string | null;
  postventa_resuelta: boolean | null;
  requiere_postventa_adicional: boolean | null;
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

type ExecuteCierreTecnicoOptions = {
  supabase?: SupabaseClient;
};

type CierreTecnicoPayload = {
  fecha_cierre_tecnico: string | null;
  responsable_cierre: string | null;
  motivo_cierre: string | null;
  observacion_cierre: string | null;
  postventa_resuelta: boolean;
  requiere_postventa_adicional: boolean;
};

function crearResultadoBase(
  command: CierreTecnicoCommand
): CierreTecnicoResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    cierre_tecnico_id: null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.cierre_tecnico",
    },
  };
}

function buildPayload(command: CierreTecnicoCommand): CierreTecnicoPayload {
  return {
    fecha_cierre_tecnico: command.payload.fecha_cierre_tecnico ?? null,
    responsable_cierre:
      normalizarTextoNullable(command.payload.responsable_cierre) ?? null,
    motivo_cierre: normalizarTextoNullable(command.payload.motivo_cierre) ?? null,
    observacion_cierre:
      normalizarTextoNullable(command.payload.observacion_cierre) ?? null,
    postventa_resuelta: command.payload.postventa_resuelta === true,
    requiere_postventa_adicional:
      command.payload.requiere_postventa_adicional === true,
  };
}

function buildCaseSyncPayload(payload: CierreTecnicoPayload) {
  return {
    proxima_accion: null,
    proxima_fecha: null,
    responsable_actual: payload.responsable_cierre,
  };
}

function buildCierreTecnicoChanges(
  payload: CierreTecnicoPayload
): CierreTecnicoChange[] {
  return [
    { campo: "cierre_tecnico.fecha_cierre_tecnico", nuevo: payload.fecha_cierre_tecnico },
    { campo: "cierre_tecnico.responsable_cierre", nuevo: payload.responsable_cierre },
    { campo: "cierre_tecnico.motivo_cierre", nuevo: payload.motivo_cierre },
    { campo: "cierre_tecnico.observacion_cierre", nuevo: payload.observacion_cierre },
    {
      campo: "cierre_tecnico.postventa_resuelta",
      nuevo: payload.postventa_resuelta ? "true" : "false",
    },
    {
      campo: "cierre_tecnico.requiere_postventa_adicional",
      nuevo: payload.requiere_postventa_adicional ? "true" : "false",
    },
  ];
}

function buildCaseChanges(args: {
  caso: Awaited<ReturnType<typeof getCasoNormalizadoById>>;
  casePayload: ReturnType<typeof buildCaseSyncPayload>;
}): CierreTecnicoChange[] {
  if (!args.caso) return [];

  const current = {
    proxima_accion: args.caso.proxima_accion ?? null,
    proxima_fecha: args.caso.proxima_fecha ?? null,
    responsable_actual:
      args.caso.workflow.continuidad.owner_actual === "administracion"
        ? "administracion"
        : null,
  };

  return Object.entries(args.casePayload)
    .filter(([key, value]) => current[key as keyof typeof current] !== value)
    .map(([key, value]) => ({
      campo: key,
      anterior: current[key as keyof typeof current] ?? null,
      nuevo: value ?? null,
    }));
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: CierreTecnicoChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) => !cambio.campo.startsWith("cierre_tecnico."))
    .map((cambio) => ({
      caso_id: args.casoId,
      campo: cambio.campo,
      valor_anterior: cambio.anterior ?? null,
      valor_nuevo: cambio.nuevo ?? null,
      origen: "manual" as const,
      actor: args.actor,
    }));
}

async function registrarBitacora(
  rows: BitacoraPayload[],
  advertencias: ActionWarning[],
  supabase: SupabaseClient
) {
  if (rows.length === 0) return;

  const { error } = await supabase.from("bitacora_cambios_caso").insert(rows);

  if (error) {
    advertencias.push({
      codigo: "bitacora_no_registrada",
      mensaje:
        "El cierre técnico se guardó, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

async function getCierreTecnicoByCasoId(
  casoId: string,
  supabase: SupabaseClient
): Promise<{
  record: CierreTecnicoRecord | null;
  tablaDisponible: boolean;
}> {
  const { data, error } = await supabase
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
    .eq("caso_id", casoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (esErrorEsquemaCierreTecnicoFaltante(error)) {
      return {
        record: null,
        tablaDisponible: false,
      };
    }

    throw new Error(error.message);
  }

  return {
    record: (data as CierreTecnicoRecord | null) ?? null,
    tablaDisponible: true,
  };
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

export async function executeCierreTecnico(
  command: CierreTecnicoCommand,
  options: ExecuteCierreTecnicoOptions = {}
): Promise<CierreTecnicoResult> {
  const result = crearResultadoBase(command);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const caso = await getCasoNormalizadoById(command.caso_id);
  const cierreTecnicoActual = await getCierreTecnicoByCasoId(
    command.caso_id,
    supabase
  );

  const validation = validateCierreTecnicoCommand({
    command,
    caso,
    cierreTecnicoExiste: !!cierreTecnicoActual.record,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const payload = buildPayload(command);
  const casePayload = buildCaseSyncPayload(payload);
  const cierreCambios = buildCierreTecnicoChanges(payload);
  const caseCambios = buildCaseChanges({
    caso,
    casePayload,
  });

  let cierreTecnicoId: string | null = null;

  if (cierreTecnicoActual.tablaDisponible) {
    const { data, error } = await supabase
      .from("cierres_tecnicos")
      .insert({
        caso_id: command.caso_id,
        fecha_cierre_tecnico: payload.fecha_cierre_tecnico,
        responsable_cierre: payload.responsable_cierre,
        motivo_cierre: payload.motivo_cierre,
        observacion_cierre: payload.observacion_cierre,
        postventa_resuelta: payload.postventa_resuelta,
        requiere_postventa_adicional: payload.requiere_postventa_adicional,
      })
      .select("id")
      .single();

    if (error) {
      if (!esErrorEsquemaCierreTecnicoFaltante(error)) {
        result.errores.push({
          caso_id: command.caso_id,
          codigo: "cierre_tecnico_no_guardado",
          mensaje:
            `No se pudo registrar el cierre técnico${error.message ? `: ${error.message}` : "."}`,
        });
        return result;
      }

      result.advertencias.push({
        caso_id: command.caso_id,
        codigo: "cierre_tecnico_tabla_no_disponible",
        mensaje:
          "La tabla de cierre técnico no está disponible vía API; se registrará la transición formal y se sincronizará el caso.",
      });
    } else {
      cierreTecnicoId = (data as { id: string }).id;
    }
  } else {
    result.advertencias.push({
      caso_id: command.caso_id,
      codigo: "cierre_tecnico_tabla_no_disponible",
      mensaje:
        "La tabla de cierre técnico no está disponible vía API; se registrará la transición formal y se sincronizará el caso.",
    });
  }

  const existingTransitionCodes = await getExistingTransitionCodes(
    command.caso_id,
    supabase
  );

  const workflowTransitions = existingTransitionCodes.has("cierre_tecnico_registrado")
    ? []
    : [
        {
          caso_id: command.caso_id,
          transition_code: "cierre_tecnico_registrado" as const,
          from_stage: "postventa" as const,
          to_stage: "cierre_tecnico" as const,
          actor,
          origin: result.metadata.origen,
          observacion:
            payload.observacion_cierre ??
            payload.motivo_cierre ??
            "Se registra formalmente el cierre técnico del caso.",
          evidencia_ref: cierreTecnicoId,
        },
      ];

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
    result.cierre_tecnico_id = cierreTecnicoId;
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
      mensaje:
        `El cierre técnico se registró, pero no se pudo sincronizar el caso${casoError.message ? `: ${casoError.message}` : "."}`,
    });
    result.cierre_tecnico_id = cierreTecnicoId;
    return result;
  }

  if (!updatedCaso?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_sincronizado",
      mensaje:
        "El cierre técnico se registró, pero no se pudo sincronizar el caso. Verifica permisos o que el caso exista.",
    });
    result.cierre_tecnico_id = cierreTecnicoId;
    return result;
  }

  result.ok = true;
  result.cierre_tecnico_id = cierreTecnicoId;
  result.cambios = [...cierreCambios, ...caseCambios];
  result.advertencias = [...result.advertencias, ...validation.advertencias];

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
