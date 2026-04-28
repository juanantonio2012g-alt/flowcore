import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  inferirEstadoComercialDesdeAccion,
  normalizarTextoNullable,
} from "@/core/domain/casos/rules";
import { getCasosNormalizados } from "../useCases/getCasosNormalizados";
import type { CasoWorklistItem } from "../contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BulkUpdateCaseChange,
  BulkUpdateCommand,
  BulkUpdateResult,
} from "./contracts";
import { sincronizarResponsableHumanoAutomatico } from "./sincronizarResponsableHumanoAutomatico";
import { validateBulkUpdateCommand } from "./validators";

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecuteBulkUpdateOptions = {
  supabase?: SupabaseClient;
};

function crearResultadoBase(command: BulkUpdateCommand): BulkUpdateResult {
  return {
    ok: false,
    accion: command.accion,
    total_recibidos: command.caso_ids.length,
    total_actualizados: 0,
    total_omitidos: command.caso_ids.length,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore-bulk-update",
    },
  };
}

async function registrarBitacora(
  rows: BitacoraPayload[],
  advertencias: BulkUpdateResult["advertencias"],
  supabase: SupabaseClient
) {
  if (!rows.length) return;

  const { error } = await supabase.from("bitacora_cambios_caso").insert(rows);

  if (error) {
    advertencias.push({
      codigo: "bitacora_no_registrada",
      mensaje: "La actualización se aplicó, pero no se pudo registrar en bitácora.",
    });
  }
}

async function sincronizarResponsablesAutomaticos(
  casoIds: string[],
  actor: string,
  result: BulkUpdateResult,
  supabase: SupabaseClient
) {
  for (const casoId of casoIds) {
    const autoasignacion = await sincronizarResponsableHumanoAutomatico({
      caso_id: casoId,
      actor,
      supabase,
    });

    result.advertencias.push(...autoasignacion.advertencias);
  }
}

function construirCambiosManual(
  casos: CasoWorklistItem[],
  command: BulkUpdateCommand
) {
  const cambiosBitacora: BitacoraPayload[] = [];
  const cambios: BulkUpdateCaseChange[] = [];
  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const nuevaFecha = command.payload?.proxima_fecha ?? null;
  const nuevoEstado = command.payload?.estado_comercial ?? null;

  for (const caso of casos) {
    if (nuevaFecha && caso.proxima_fecha_real !== nuevaFecha) {
      cambiosBitacora.push({
        caso_id: caso.id,
        campo: "proxima_fecha",
        valor_anterior: caso.proxima_fecha_real,
        valor_nuevo: nuevaFecha,
        origen: "masivo",
        actor,
      });
    }

    if (nuevoEstado && caso.estado_comercial_real !== nuevoEstado) {
      cambiosBitacora.push({
        caso_id: caso.id,
        campo: "estado_comercial",
        valor_anterior: caso.estado_comercial_real,
        valor_nuevo: nuevoEstado,
        origen: "masivo",
        actor,
      });
    }

    cambios.push({
      caso_id: caso.id,
      estado_anterior: caso.estado_comercial_real,
      estado_nuevo: nuevoEstado ?? caso.estado_comercial_real,
      resultado: "actualizado",
      mensaje: "Actualización manual aplicada.",
    });
  }

  return { cambios, cambiosBitacora };
}

async function ejecutarActualizacionManual(
  casos: CasoWorklistItem[],
  command: BulkUpdateCommand,
  result: BulkUpdateResult,
  supabase: SupabaseClient
) {
  const payload: Record<string, string | null> = {};
  const nuevaFecha = command.payload?.proxima_fecha ?? null;
  const nuevoEstado = command.payload?.estado_comercial ?? null;

  if (nuevaFecha) payload.proxima_fecha = nuevaFecha;
  if (nuevoEstado) payload.estado_comercial = nuevoEstado;

  const { data: updatedRows, error } = await supabase
    .from("casos")
    .update(payload)
    .in("id", casos.map((caso) => caso.id))
    .select("id");

  if (error) {
    result.errores.push({
      codigo: "bulk_update_error",
      mensaje: "No se pudo aplicar la actualización masiva.",
    });

    result.cambios = casos.map((caso) => ({
      caso_id: caso.id,
      estado_anterior: caso.estado_comercial_real,
      estado_nuevo: caso.estado_comercial_real,
      resultado: "error",
      mensaje: error.message,
    }));

    return result;
  }

  const updatedIds = new Set(
    ((updatedRows as Array<{ id: string }> | null) ?? []).map((row) => row.id)
  );
  const casosActualizados = casos.filter((caso) => updatedIds.has(caso.id));
  const casosNoActualizados = casos.filter((caso) => !updatedIds.has(caso.id));
  const { cambios, cambiosBitacora } = construirCambiosManual(
    casosActualizados,
    command
  );

  result.ok = casosNoActualizados.length === 0;
  result.total_actualizados = casosActualizados.length;
  result.total_omitidos = casos.length - casosActualizados.length;
  result.cambios = [
    ...cambios,
    ...casosNoActualizados.map((caso) => ({
      caso_id: caso.id,
      estado_anterior: caso.estado_comercial_real,
      estado_nuevo: caso.estado_comercial_real,
      resultado: "error" as const,
      mensaje:
        "No se pudo aplicar la actualización a este caso. Verifica permisos o que siga disponible.",
    })),
  ];

  if (casosNoActualizados.length > 0) {
    result.errores.push({
      codigo: "bulk_update_incompleto",
      mensaje:
        "La actualización masiva no pudo aplicarse a todos los casos seleccionados.",
    });
  }

  await sincronizarResponsablesAutomaticos(
    casosActualizados.map((caso) => caso.id),
    normalizarTextoNullable(command.actor) ?? "sistema",
    result,
    supabase
  );

  await registrarBitacora(cambiosBitacora, result.advertencias, supabase);

  return result;
}

async function ejecutarSugerencia(
  casos: CasoWorklistItem[],
  command: BulkUpdateCommand,
  result: BulkUpdateResult,
  supabase: SupabaseClient
) {
  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const cambiosBitacora: BitacoraPayload[] = [];

  for (const caso of casos) {
    const estadoSugerido =
      inferirEstadoComercialDesdeAccion(
        caso.recomendacion_accion,
        caso.estado_comercial_real
      ) ?? caso.estado_comercial_real;

    const payload = {
      proxima_accion: normalizarTextoNullable(caso.recomendacion_accion),
      proxima_fecha: caso.recomendacion_fecha,
      estado_comercial: estadoSugerido,
    };

    const { data: updatedCase, error } = await supabase
      .from("casos")
      .update(payload)
      .eq("id", caso.id)
      .select("id")
      .maybeSingle();

    if (error || !updatedCase?.id) {
      result.errores.push({
        caso_id: caso.id,
        codigo: "caso_no_actualizado",
        mensaje: `No se pudo aplicar la sugerencia al caso ${caso.id.slice(0, 8)}.`,
      });
      result.cambios.push({
        caso_id: caso.id,
        estado_anterior: caso.estado_comercial_real,
        estado_nuevo: caso.estado_comercial_real,
        resultado: "error",
        mensaje:
          error?.message ??
          "Verifica permisos o que el caso siga disponible para la actualización.",
      });
      continue;
    }

    result.total_actualizados += 1;
    result.cambios.push({
      caso_id: caso.id,
      estado_anterior: caso.estado_comercial_real,
      estado_nuevo: estadoSugerido,
      resultado: "actualizado",
      mensaje: "Sugerencia aplicada.",
    });

    cambiosBitacora.push({
      caso_id: caso.id,
      campo: "proxima_accion",
      valor_anterior: caso.proxima_accion_real,
      valor_nuevo: normalizarTextoNullable(caso.recomendacion_accion),
      origen: "masivo",
      actor,
    });

    if (caso.recomendacion_fecha !== caso.proxima_fecha_real) {
      cambiosBitacora.push({
        caso_id: caso.id,
        campo: "proxima_fecha",
        valor_anterior: caso.proxima_fecha_real,
        valor_nuevo: caso.recomendacion_fecha,
        origen: "masivo",
        actor,
      });
    }

    if (estadoSugerido !== caso.estado_comercial_real) {
      cambiosBitacora.push({
        caso_id: caso.id,
        campo: "estado_comercial",
        valor_anterior: caso.estado_comercial_real,
        valor_nuevo: estadoSugerido,
        origen: "masivo",
        actor,
      });
    }
  }

  await sincronizarResponsablesAutomaticos(
    result.cambios
      .filter((cambio) => cambio.resultado === "actualizado")
      .map((cambio) => cambio.caso_id),
    actor,
    result,
    supabase
  );

  result.total_omitidos = result.total_recibidos - result.total_actualizados;
  result.ok = result.errores.length === 0;

  await registrarBitacora(cambiosBitacora, result.advertencias, supabase);

  if (result.errores.length > 0 && result.total_actualizados > 0) {
    result.advertencias.push({
      codigo: "aplicacion_parcial",
      mensaje: "La sugerencia se aplicó parcialmente.",
    });
  }

  return result;
}

export async function executeBulkUpdate(
  command: BulkUpdateCommand,
  options: ExecuteBulkUpdateOptions = {}
): Promise<BulkUpdateResult> {
  const result = crearResultadoBase(command);
  const casosNormalizados = await getCasosNormalizados();
  const supabase = options.supabase ?? createServerSupabaseClient();
  const casosSeleccionados = casosNormalizados.items.filter((caso) =>
    command.caso_ids.includes(caso.id)
  );
  const validation = validateBulkUpdateCommand(command, casosSeleccionados);

  if (!validation.ok) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    result.cambios = command.caso_ids.map((casoId) => ({
      caso_id: casoId,
      resultado: "omitido",
      mensaje: "La acción fue bloqueada por validación.",
    }));
    return result;
  }

  result.advertencias = validation.advertencias;

  if (command.accion === "actualizacion_manual") {
    return ejecutarActualizacionManual(casosSeleccionados, command, result, supabase);
  }

  return ejecutarSugerencia(casosSeleccionados, command, result, supabase);
}
