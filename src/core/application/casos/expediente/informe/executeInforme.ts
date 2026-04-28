import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "@/core/application/casos/useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  sincronizarResponsableHumanoAutomatico,
  type ActionWarning,
} from "@/core/application/casos/actions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InformeChange,
  InformeCommand,
  InformeResult,
} from "./contracts";
import { validateInformeCommand } from "./validators";

type InformeRecord = {
  id: string;
  caso_id: string;
  fecha_recepcion: string | null;
  resumen_tecnico: string | null;
  hallazgos_principales: string | null;
  estado_revision: string | null;
  created_at: string | null;
};

type EvidenciaRecord = {
  id: string;
  informe_id: string;
};

type CaseWriteState = {
  responsable_actual: string | null;
};

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecuteInformeOptions = {
  supabase?: SupabaseClient;
};

function crearResultadoBase(command: InformeCommand): InformeResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    informe_id: command.informe_id ?? null,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.expediente.informe",
    },
  };
}

async function getInformeById(
  informeId: string,
  casoId: string,
  supabase: SupabaseClient
): Promise<InformeRecord | null> {
  const { data, error } = await supabase
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
    .eq("id", informeId)
    .eq("caso_id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as InformeRecord | null) ?? null;
}

async function getEvidenciasByInformeId(
  informeId: string | null | undefined,
  supabase: SupabaseClient
): Promise<EvidenciaRecord[]> {
  if (!informeId) return [];

  const { data, error } = await supabase
    .from("evidencias_informe")
    .select("id, informe_id")
    .eq("informe_id", informeId);

  if (error) {
    throw new Error(error.message);
  }

  return (data as EvidenciaRecord[] | null) ?? [];
}

function buildInformePayload(command: InformeCommand) {
  return {
    fecha_recepcion: command.payload.fecha_recepcion ?? null,
    resumen_tecnico:
      normalizarTextoNullable(command.payload.resumen_tecnico) ?? null,
    hallazgos_principales:
      normalizarTextoNullable(command.payload.hallazgos_principales) ?? null,
    estado_revision:
      normalizarTextoNullable(command.payload.estado_revision) ?? null,
  };
}

function buildInformeChanges(args: {
  action: InformeCommand["accion"];
  previous: InformeRecord | null;
  next: ReturnType<typeof buildInformePayload>;
}): InformeChange[] {
  const { action, previous, next } = args;
  const source = previous ?? {
    fecha_recepcion: null,
    resumen_tecnico: null,
    hallazgos_principales: null,
    estado_revision: null,
  };

  const campos: Array<keyof ReturnType<typeof buildInformePayload>> = [
    "fecha_recepcion",
    "resumen_tecnico",
    "hallazgos_principales",
    "estado_revision",
  ];

  return campos
    .filter((campo) => action === "registrar_informe" || source[campo] !== next[campo])
    .map((campo) => ({
      campo: `informe.${campo}`,
      anterior: source[campo] ?? null,
      nuevo: next[campo] ?? null,
    }));
}

async function getCaseWriteState(
  casoId: string,
  supabase: SupabaseClient
): Promise<CaseWriteState | null> {
  const { data, error } = await supabase
    .from("casos")
    .select("responsable_actual")
    .eq("id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CaseWriteState | null) ?? null;
}

function buildCaseSyncPayload() {
  return {
    responsable_actual: "Técnico",
  };
}

function buildCaseChanges(caseState: CaseWriteState | null): InformeChange[] {
  if ((caseState?.responsable_actual ?? "") === "Técnico") {
    return [];
  }

  return [
    {
      campo: "responsable_actual",
      anterior: caseState?.responsable_actual ?? null,
      nuevo: "Técnico",
    },
  ];
}

function buildBitacoraRows(args: {
  casoId: string;
  actor: string;
  cambios: InformeChange[];
}): BitacoraPayload[] {
  return args.cambios
    .filter((cambio) => cambio.campo === "responsable_actual")
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
        "El informe se registró, pero no se pudo registrar la bitácora del caso.",
    });
  }
}

export async function executeInforme(
  command: InformeCommand,
  options: ExecuteInformeOptions = {}
): Promise<InformeResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const informeActual =
    command.accion === "actualizar_informe" && command.informe_id
      ? await getInformeById(command.informe_id, command.caso_id, supabase)
      : null;
  const evidenciasActuales = await getEvidenciasByInformeId(
    informeActual?.id ?? null,
    supabase
  );

  const validation = validateInformeCommand({
    command,
    caso,
    informeExiste: !!informeActual,
    evidenciasExistentes: evidenciasActuales.length,
  });

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const informePayload = buildInformePayload(command);
  const caseState = await getCaseWriteState(command.caso_id, supabase);
  const informeCambios = buildInformeChanges({
    action: command.accion,
    previous: informeActual,
    next: informePayload,
  });
  const caseCambios = buildCaseChanges(caseState);
  const casePayload = buildCaseSyncPayload();
  const evidencias = command.payload.evidencias ?? [];

  let informeId = command.informe_id ?? null;

  if (command.accion === "registrar_informe") {
    const { data, error } = await supabase
      .from("informes_tecnicos")
      .insert({
        caso_id: command.caso_id,
        ...informePayload,
      })
      .select("id")
      .single();

    if (error || !data) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "informe_no_guardado",
        mensaje: "No se pudo registrar el informe técnico.",
      });
      return result;
    }

    informeId = (data as { id: string }).id;
  } else {
    const { data: updatedInforme, error } = await supabase
      .from("informes_tecnicos")
      .update(informePayload)
      .eq("id", command.informe_id)
      .eq("caso_id", command.caso_id)
      .select("id")
      .maybeSingle();

    if (error) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "informe_no_actualizado",
        mensaje: "No se pudo actualizar el informe técnico.",
      });
      return result;
    }

    if (!updatedInforme?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "informe_no_actualizado",
        mensaje:
          "No se pudo actualizar el informe técnico. Verifica permisos o que el informe pertenezca al caso.",
      });
      return result;
    }

    informeId = command.informe_id ?? null;
  }

  if (evidencias.length > 0) {
    const { error: evidenciasError } = await supabase
      .from("evidencias_informe")
      .insert(
        evidencias.map((evidencia) => ({
          caso_id: command.caso_id,
          informe_id: informeId,
          archivo_path: evidencia.archivo_path,
          archivo_url: evidencia.archivo_url,
          nombre_archivo: evidencia.nombre_archivo,
          descripcion: evidencia.descripcion ?? null,
          tipo: evidencia.tipo ?? "foto",
        }))
      );

    if (evidenciasError) {
      if (command.accion === "registrar_informe" && informeId) {
        await supabase.from("informes_tecnicos").delete().eq("id", informeId);
      }

      result.errores.push({
        caso_id: command.caso_id,
        codigo: "evidencias_no_guardadas",
        mensaje:
          "No se pudieron vincular las evidencias al informe técnico. El write fue revertido en base de datos.",
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
          "El informe se registró, pero no se pudo sincronizar el ownership técnico del caso.",
      });
      result.informe_id = informeId;
      return result;
    }

    if (!updatedCaso?.id) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "caso_no_sincronizado",
        mensaje:
          "El informe se registró, pero no se pudo sincronizar el ownership técnico del caso. Verifica permisos o que el caso exista.",
      });
      result.informe_id = informeId;
      return result;
    }
  }

  result.ok = true;
  result.informe_id = informeId;
  result.cambios = [
    ...informeCambios,
    ...evidencias.map((evidencia) => ({
      campo: "informe.evidencia",
      anterior: null,
      nuevo: evidencia.nombre_archivo,
    })),
    ...caseCambios,
  ];
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
