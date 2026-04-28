import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  esErrorEsquemaValidacionDiagnosticoFaltante,
  mensajeSchemaValidacionDiagnosticoIncompleta,
} from "@/core/application/casos/adapter/diagnosticoValidacionCompat";
import { esErrorEsquemaWorkflowTransitionsFaltante } from "@/core/application/casos/adapter/workflowTransitionsCompat";
import { registerWorkflowTransitions } from "@/core/application/casos/workflow/registerWorkflowTransitions";
import type {
  DiagnosticoChange,
  DiagnosticoValidacionCommand,
  DiagnosticoValidacionResult,
  DiagnosticoResultadoValidacion,
} from "./contracts";
import { validateDiagnosticoValidacionCommand } from "./validateDiagnosticoValidacionCommand";

type DiagnosticoValidacionRecord = {
  id: string;
  caso_id: string;
  validado_por: string | null;
  fecha_validacion: string | null;
  resultado_validacion: DiagnosticoResultadoValidacion | null;
  observacion_validacion: string | null;
};

type CaseWriteState = {
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

type ExecuteDiagnosticoValidacionOptions = {
  supabase?: SupabaseClient;
};

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

type WorkflowTransitionLookupRecord = {
  id: string;
};

function crearResultadoBase(
  command: DiagnosticoValidacionCommand
): DiagnosticoValidacionResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    diagnostico_id: command.diagnostico_id,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.diagnostico.validacion",
    },
  };
}

async function getDiagnosticoValidacionById(
  diagnosticoId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<DiagnosticoValidacionRecord | null> {
  const { data, error } = await supabase
    .from("diagnosticos")
    .select(`
      id,
      caso_id,
      validado_por,
      fecha_validacion,
      resultado_validacion,
      observacion_validacion
    `)
    .eq("id", diagnosticoId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as DiagnosticoValidacionRecord | null) ?? null;
}

async function getCaseWriteState(
  casoId: string,
  supabase: SupabaseClient
): Promise<CaseWriteState | null> {
  const { data, error } = await supabase
    .from("casos")
    .select("proxima_accion, proxima_fecha")
    .eq("id", casoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CaseWriteState | null) ?? null;
}

function fechaHoyIsoDia() {
  return new Date().toISOString().slice(0, 10);
}

function esUuid(valor: string | null | undefined) {
  if (!valor) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function buildDiagnosticoValidacionPayload(command: DiagnosticoValidacionCommand) {
  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const validadoPorPayload =
    normalizarTextoNullable(command.payload.validado_por) ?? null;
  const validadoPorFinal = esUuid(validadoPorPayload)
    ? validadoPorPayload
    : esUuid(actor)
      ? actor
      : null;

  return {
    validado_por: validadoPorFinal,
    fecha_validacion: command.payload.fecha_validacion ?? fechaHoyIsoDia(),
    resultado_validacion: command.payload.resultado_validacion,
    observacion_validacion:
      normalizarTextoNullable(command.payload.observacion_validacion) ?? null,
  };
}

function buildDiagnosticoValidacionChanges(args: {
  previous: DiagnosticoValidacionRecord | null;
  next: ReturnType<typeof buildDiagnosticoValidacionPayload>;
}): DiagnosticoChange[] {
  const source = args.previous ?? {
    validado_por: null,
    fecha_validacion: null,
    resultado_validacion: null,
    observacion_validacion: null,
  };

  const campos: Array<keyof ReturnType<typeof buildDiagnosticoValidacionPayload>> = [
    "validado_por",
    "fecha_validacion",
    "resultado_validacion",
    "observacion_validacion",
  ];

  return campos
    .filter((campo) => source[campo] !== args.next[campo])
    .map((campo) => ({
      campo: `diagnostico.${campo}`,
      anterior: source[campo] ?? null,
      nuevo: args.next[campo] ?? null,
    }));
}

function buildCaseSyncPayload(args: {
  payload: ReturnType<typeof buildDiagnosticoValidacionPayload>;
}) {
  const casePayload: Record<string, string | null> = {};

  if (args.payload.resultado_validacion === "validado") {
    casePayload.proxima_accion = "Preparar cotización";
    casePayload.proxima_fecha = args.payload.fecha_validacion ?? fechaHoyIsoDia();
  }

  return casePayload;
}

function buildCaseChanges(args: {
  previous: CaseWriteState | null;
  next: Record<string, string | null>;
}): DiagnosticoChange[] {
  const campos: Array<keyof CaseWriteState> = ["proxima_accion", "proxima_fecha"];

  return campos
    .filter(
      (campo) =>
        Object.prototype.hasOwnProperty.call(args.next, campo) &&
        (args.previous?.[campo] ?? null) !== (args.next[campo] ?? null)
    )
    .map((campo) => ({
      campo,
      anterior: args.previous?.[campo] ?? null,
      nuevo: args.next[campo] ?? null,
    }));
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: DiagnosticoChange[];
}): BitacoraPayload[] {
  return args.cambios.map((cambio) => ({
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
      codigo: "bitacora_validacion_no_registrada",
      mensaje:
        "La validación del diagnóstico se registró, pero no se pudo dejar trazabilidad en la bitácora del caso.",
    });
  }
}

function mensajeDiagnosticoValidacionProbablePolicyRls() {
  return "No se pudo registrar la validacion del diagnostico. La fila existe y coincide con el caso indicado, por lo que el bloqueo mas probable es una policy RLS de UPDATE sobre public.diagnosticos para este usuario.";
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

async function existeTransicionDiagnosticoValidado(args: {
  casoId: string;
  diagnosticoId: string;
  supabase: SupabaseClient;
}) {
  const { data, error } = await args.supabase
    .from("workflow_transitions")
    .select("id")
    .eq("caso_id", args.casoId)
    .eq("transition_code", "diagnostico_validado")
    .eq("evidencia_ref", args.diagnosticoId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!(data as WorkflowTransitionLookupRecord | null)?.id;
}

async function asegurarTransicionDiagnosticoValidado(args: {
  command: DiagnosticoValidacionCommand;
  payload: ReturnType<typeof buildDiagnosticoValidacionPayload>;
  actor: string;
  origin: string;
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
  if (args.payload.resultado_validacion !== "validado") {
    return {
      ok: true,
      created: false,
    };
  }

  try {
    const yaExiste = await existeTransicionDiagnosticoValidado({
      casoId: args.command.caso_id,
      diagnosticoId: args.command.diagnostico_id,
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
          "La tabla workflow_transitions no está disponible para registrar la transición formal del diagnóstico validado.",
      };
    }

    return {
      ok: false,
      message:
        describirErrorSupabase(error) ??
        "No se pudo verificar la transición formal del diagnóstico validado.",
    };
  }

  const workflowTransitionResult = await registerWorkflowTransitions(
    [
      {
        caso_id: args.command.caso_id,
        transition_code: "diagnostico_validado",
        from_stage: "diagnostico",
        to_stage: "diagnostico",
        actor: args.actor,
        origin: args.origin,
        occurred_at: args.payload.fecha_validacion,
        observacion: args.payload.observacion_validacion,
        evidencia_ref: args.command.diagnostico_id,
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

export async function executeDiagnosticoValidacion(
  command: DiagnosticoValidacionCommand,
  options: ExecuteDiagnosticoValidacionOptions = {}
): Promise<DiagnosticoValidacionResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  let diagnosticoActual: DiagnosticoValidacionRecord | null = null;
  let caseState: CaseWriteState | null = null;

  try {
    diagnosticoActual = await getDiagnosticoValidacionById(
      command.diagnostico_id,
      command.caso_id,
      supabase
    );
  } catch (error) {
    if (esErrorEsquemaValidacionDiagnosticoFaltante(error)) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_validacion_schema_incompleta",
        mensaje: mensajeSchemaValidacionDiagnosticoIncompleta(),
      });
      return result;
    }

    throw error;
  }

  const validation = validateDiagnosticoValidacionCommand({
    command,
    caso,
    diagnosticoExiste: !!diagnosticoActual,
  });

  if (!validation.ok || !caso || !diagnosticoActual) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const payload = buildDiagnosticoValidacionPayload(command);
  const diagnosticoCambios = buildDiagnosticoValidacionChanges({
    previous: diagnosticoActual,
    next: payload,
  });
  caseState = await getCaseWriteState(command.caso_id, supabase);
  const casePayload = buildCaseSyncPayload({
    payload,
  });
  const caseCambios = buildCaseChanges({
    previous: caseState,
    next: casePayload,
  });
  const cambios = [...diagnosticoCambios, ...caseCambios];

  if (cambios.length === 0) {
    const workflowTransitionResult = await asegurarTransicionDiagnosticoValidado({
      command,
      payload,
      actor,
      origin: result.metadata.origen,
      supabase,
    });

    if (!workflowTransitionResult.ok) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "workflow_transition_no_registrada",
        mensaje: `La validación ya estaba resuelta en el diagnóstico, pero no se pudo asegurar su transición formal en workflow. ${workflowTransitionResult.message}`,
      });
      return result;
    }

    result.ok = true;
    result.advertencias = [
      ...validation.advertencias,
      {
        caso_id: command.caso_id,
        codigo: "validacion_sin_cambios",
        mensaje:
          "La validación no produjo cambios respecto al estado actual del diagnóstico.",
      },
      ...(workflowTransitionResult.created
        ? [
            {
              caso_id: command.caso_id,
              codigo: "workflow_transition_backfilled",
              mensaje:
                "El diagnóstico ya estaba validado y se registró la transición formal faltante en workflow.",
            } satisfies ActionWarning,
          ]
        : []),
    ];
    return result;
  }

  if (diagnosticoCambios.length > 0) {
    const { data: updatedDiagnostico, error } = await supabase
      .from("diagnosticos")
      .update(payload)
      .eq("id", command.diagnostico_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (esErrorEsquemaValidacionDiagnosticoFaltante(error)) {
        result.errores.push({
          caso_id: command.caso_id,
          codigo: "diagnostico_validacion_schema_incompleta",
          mensaje: mensajeSchemaValidacionDiagnosticoIncompleta(),
        });
        return result;
      }

      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_validacion_no_actualizada",
        mensaje:
          describirErrorSupabase(error) ??
          "No se pudo registrar la validación del diagnóstico.",
      });
      return result;
    }

    if (!updatedDiagnostico?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_validacion_no_actualizada",
        mensaje: mensajeDiagnosticoValidacionProbablePolicyRls(),
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
          "La validación del diagnóstico se guardó, pero no se pudo sincronizar la continuidad del caso.",
      });
      return result;
    }

    if (!updatedCaso?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "caso_no_sincronizado",
        mensaje:
          "La validación del diagnóstico se guardó, pero no se pudo avanzar la continuidad del caso. Verifica permisos o que el caso exista.",
      });
      return result;
    }
  }

  result.ok = true;
  result.cambios = cambios;
  result.advertencias = validation.advertencias;

  const workflowTransitionResult = await asegurarTransicionDiagnosticoValidado({
    command,
    payload,
    actor,
    origin: result.metadata.origen,
    supabase,
  });

  if (!workflowTransitionResult.ok) {
    result.ok = false;
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "workflow_transition_no_registrada",
      mensaje: `La validación del diagnóstico se guardó, pero no se pudo persistir la transición formal del workflow. ${workflowTransitionResult.message}`,
    });
    return result;
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
      cambios,
    }),
    result.advertencias,
    supabase
  );

  return result;
}
