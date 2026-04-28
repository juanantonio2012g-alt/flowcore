import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DiagnosticoChange,
  DiagnosticoCommand,
  DiagnosticoResult,
} from "./contracts";
import { validateDiagnosticoCommand } from "./validators";

type DiagnosticoRecord = {
  id: string;
  caso_id: string;
  problematica_identificada: string | null;
  causa_probable: string | null;
  nivel_certeza: string | null;
  categoria_caso: string | null;
  solucion_recomendada: string | null;
  producto_recomendado: string | null;
  proceso_sugerido: string | null;
  observaciones_tecnicas: string | null;
  requiere_validacion: boolean | null;
  fecha_validacion: string | null;
  created_at: string | null;
};

type CaseWriteState = {
  responsable_actual: string | null;
  diagnostico_por: string | null;
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

type ExecuteDiagnosticoOptions = {
  supabase?: SupabaseClient;
};

function crearResultadoBase(command: DiagnosticoCommand): DiagnosticoResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    diagnostico_id: command.diagnostico_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.diagnostico",
    },
  };
}

async function getDiagnosticoById(
  diagnosticoId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<DiagnosticoRecord | null> {
  const { data, error } = await supabase
    .from("diagnosticos")
    .select(`
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
    `)
    .eq("id", diagnosticoId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as DiagnosticoRecord | null) ?? null;
}

async function getCaseWriteState(
  casoId: string,
  supabase: SupabaseClient
): Promise<CaseWriteState | null> {
  const { data, error } = await supabase
    .from("casos")
    .select("responsable_actual, diagnostico_por, proxima_accion, proxima_fecha")
    .eq("id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CaseWriteState | null) ?? null;
}

function fechaHoyIsoDiaLocal() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildDiagnosticoPayload(command: DiagnosticoCommand) {
  return {
    problematica_identificada:
      normalizarTextoNullable(command.payload.problematica_identificada) ?? null,
    causa_probable:
      normalizarTextoNullable(command.payload.causa_probable) ?? null,
    nivel_certeza:
      normalizarTextoNullable(command.payload.nivel_certeza) ?? null,
    categoria_caso:
      normalizarTextoNullable(command.payload.categoria_caso) ?? null,
    solucion_recomendada:
      normalizarTextoNullable(command.payload.solucion_recomendada) ?? null,
    producto_recomendado:
      normalizarTextoNullable(command.payload.producto_recomendado) ?? null,
    proceso_sugerido:
      normalizarTextoNullable(command.payload.proceso_sugerido) ?? null,
    observaciones_tecnicas:
      normalizarTextoNullable(command.payload.observaciones_tecnicas) ?? null,
    requiere_validacion: command.payload.requiere_validacion ?? false,
    fecha_validacion: command.payload.fecha_validacion ?? null,
  };
}

function buildDiagnosticoChanges(args: {
  action: DiagnosticoCommand["accion"];
  previous: DiagnosticoRecord | null;
  next: ReturnType<typeof buildDiagnosticoPayload>;
}): DiagnosticoChange[] {
  const { action, previous, next } = args;
  const source = previous ?? {
    problematica_identificada: null,
    causa_probable: null,
    nivel_certeza: null,
    categoria_caso: null,
    solucion_recomendada: null,
    producto_recomendado: null,
    proceso_sugerido: null,
    observaciones_tecnicas: null,
    requiere_validacion: null,
    fecha_validacion: null,
  };

  const campos: Array<keyof ReturnType<typeof buildDiagnosticoPayload>> = [
    "problematica_identificada",
    "causa_probable",
    "nivel_certeza",
    "categoria_caso",
    "solucion_recomendada",
    "producto_recomendado",
    "proceso_sugerido",
    "observaciones_tecnicas",
    "requiere_validacion",
    "fecha_validacion",
  ];

  return campos
    .filter((campo) => action === "registrar_diagnostico" || source[campo] !== next[campo])
    .map((campo) => ({
      campo: `diagnostico.${campo}`,
      anterior:
        typeof source[campo] === "boolean"
          ? source[campo]
            ? "true"
            : "false"
          : source[campo] ?? null,
      nuevo:
        typeof next[campo] === "boolean"
          ? next[campo]
            ? "true"
            : "false"
          : next[campo] ?? null,
    }));
}

function buildCaseSyncPayload(args: {
  actor: string;
  diagnosticoPayload: ReturnType<typeof buildDiagnosticoPayload>;
}) {
  const payload: Record<string, string | null> = {
    responsable_actual: "Técnico",
    diagnostico_por: args.actor,
  };

  if (args.diagnosticoPayload.requiere_validacion === true) {
    payload.proxima_accion = "Validar diagnóstico humano";
    payload.proxima_fecha =
      args.diagnosticoPayload.fecha_validacion ?? fechaHoyIsoDiaLocal();
  };

  return payload;
}

function buildCaseChanges(args: {
  caseState: CaseWriteState | null;
  casePayload: Record<string, string | null>;
  actor: string;
}): DiagnosticoChange[] {
  const { caseState, casePayload, actor } = args;
  const cambios: DiagnosticoChange[] = [];

  if ((caseState?.responsable_actual ?? "") !== "Técnico") {
    cambios.push({
      campo: "responsable_actual",
      anterior: caseState?.responsable_actual ?? null,
      nuevo: "Técnico",
    });
  }

  if ((caseState?.diagnostico_por ?? "") !== actor) {
    cambios.push({
      campo: "diagnostico_por",
      anterior: caseState?.diagnostico_por ?? null,
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
  cambios: DiagnosticoChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) =>
      [
        "responsable_actual",
        "diagnostico_por",
        "proxima_accion",
        "proxima_fecha",
      ].includes(cambio.campo)
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
        "El diagnóstico se registró, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

export async function executeDiagnostico(
  command: DiagnosticoCommand,
  options: ExecuteDiagnosticoOptions = {}
): Promise<DiagnosticoResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const diagnosticoActual =
    command.accion === "actualizar_diagnostico" && command.diagnostico_id
      ? await getDiagnosticoById(command.diagnostico_id, command.caso_id, supabase)
      : null;

  const validation = validateDiagnosticoCommand({
    command,
    caso,
    diagnosticoExiste: !!diagnosticoActual,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const diagnosticoPayload = buildDiagnosticoPayload(command);
  const caseState = await getCaseWriteState(command.caso_id, supabase);
  const diagnosticoCambios = buildDiagnosticoChanges({
    action: command.accion,
    previous: diagnosticoActual,
    next: diagnosticoPayload,
  });
  const casePayload = buildCaseSyncPayload({
    actor,
    diagnosticoPayload,
  });
  const caseCambios = buildCaseChanges({
    caseState,
    casePayload,
    actor,
  });

  let diagnosticoId = command.diagnostico_id ?? null;

  if (command.accion === "registrar_diagnostico") {
    const { data, error } = await supabase
      .from("diagnosticos")
      .insert({
        caso_id: command.caso_id,
        ...diagnosticoPayload,
      })
      .select("id")
      .single();

    if (error || !data) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_no_guardado",
        mensaje: "No se pudo registrar el diagnóstico.",
      });
      return result;
    }

    diagnosticoId = (data as { id: string }).id;
  } else {
    const { data: updatedDiagnostico, error } = await supabase
      .from("diagnosticos")
      .update(diagnosticoPayload)
      .eq("id", command.diagnostico_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_no_actualizado",
        mensaje: "No se pudo actualizar el diagnóstico.",
      });
      return result;
    }

    if (!updatedDiagnostico?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "diagnostico_no_actualizado",
        mensaje:
          "No se pudo actualizar el diagnóstico. Verifica permisos o que pertenezca al caso indicado.",
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
          "El diagnóstico se registró, pero no se pudo sincronizar el ownership técnico del caso.",
      });
      result.diagnostico_id = diagnosticoId;
      return result;
    }

    if (!updatedCaso?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "caso_no_sincronizado",
        mensaje:
          "El diagnóstico se registró, pero no se pudo sincronizar el ownership técnico del caso. Verifica permisos o que el caso exista.",
      });
      result.diagnostico_id = diagnosticoId;
      return result;
    }
  }

  result.ok = true;
  result.diagnostico_id = diagnosticoId;
  result.cambios = [...diagnosticoCambios, ...caseCambios];
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
