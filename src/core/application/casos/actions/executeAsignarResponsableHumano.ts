import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "../useCases/getCasoNormalizadoById";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import {
  detectarInvalidacionPorCambioMacroarea,
  validarAsignacionPersona,
} from "@/core/domain/personas/validar-asignacion";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AsignarResponsableHumanoCommand,
  AsignarResponsableHumanoResult,
  QuickUpdateChange,
} from "./contracts";

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual";
  actor: string;
};

type AsignacionActual = {
  responsable_humano_id: string | null;
  responsable_humano_nombre: string | null;
  responsable_humano_asignado_por: string | null;
  responsable_humano_asignado_at: string | null;
};

type ExecuteAsignarResponsableHumanoOptions = {
  supabase?: SupabaseClient;
};

function resultadoBase(
  command: AsignarResponsableHumanoCommand
): AsignarResponsableHumanoResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore-asignacion-humana",
    },
  };
}

function payloadTieneCampoResponsable(command: AsignarResponsableHumanoCommand) {
  return Object.prototype.hasOwnProperty.call(
    command.payload ?? {},
    "responsable_humano_id"
  );
}

async function obtenerAsignacionActual(
  casoId: string,
  supabase: SupabaseClient
): Promise<AsignacionActual | null> {
  const { data, error } = await supabase
    .from("casos")
    .select(
      "responsable_humano_id,responsable_humano_nombre,responsable_humano_asignado_por,responsable_humano_asignado_at"
    )
    .eq("id", casoId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AsignacionActual | null) ?? null;
}

function construirCambios(
  actual: AsignacionActual,
  siguiente: AsignacionActual
): QuickUpdateChange[] {
  const campos = [
    "responsable_humano_id",
    "responsable_humano_nombre",
    "responsable_humano_asignado_por",
    "responsable_humano_asignado_at",
  ] as const;

  return campos
    .filter((campo) => (actual[campo] ?? "") !== (siguiente[campo] ?? ""))
    .map((campo) => ({
      campo,
      anterior: actual[campo],
      nuevo: siguiente[campo],
    }));
}

function construirBitacora(
  casoId: string,
  actor: string,
  cambios: QuickUpdateChange[]
): BitacoraPayload[] {
  return cambios.map((cambio) => ({
    caso_id: casoId,
    campo: cambio.campo,
    valor_anterior: cambio.anterior ?? null,
    valor_nuevo: cambio.nuevo ?? null,
    origen: "manual",
    actor,
  }));
}

async function registrarBitacora(
  rows: BitacoraPayload[],
  result: AsignarResponsableHumanoResult,
  supabase: SupabaseClient
) {
  if (!rows.length) return;

  const { error } = await supabase.from("bitacora_cambios_caso").insert(rows);

  if (error) {
    result.advertencias.push({
      caso_id: rows[0]?.caso_id,
      codigo: "bitacora_no_registrada",
      mensaje: "La asignación se aplicó, pero no se pudo registrar en bitácora.",
    });
  }
}

function limpiarAsignacion(): AsignacionActual {
  return {
    responsable_humano_id: null,
    responsable_humano_nombre: null,
    responsable_humano_asignado_por: null,
    responsable_humano_asignado_at: null,
  };
}

export async function executeAsignarResponsableHumano(
  command: AsignarResponsableHumanoCommand,
  options: ExecuteAsignarResponsableHumanoOptions = {}
): Promise<AsignarResponsableHumanoResult> {
  const result = resultadoBase(command);
  const supabase = options.supabase ?? createServerSupabaseClient();

  if (!command.caso_id) {
    result.errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para asignar responsable humano.",
    });
    return result;
  }

  const caso = await getCasoNormalizadoById(command.caso_id);
  if (!caso) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_encontrado",
      mensaje: "No se encontró el caso solicitado.",
    });
    return result;
  }

  const actual = await obtenerAsignacionActual(command.caso_id, supabase);
  if (!actual) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_encontrado",
      mensaje: "No se encontró el caso solicitado.",
    });
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const timestamp = new Date().toISOString();
  const responsableIdSolicitado = payloadTieneCampoResponsable(command)
    ? normalizarTextoNullable(command.payload?.responsable_humano_id)
    : actual.responsable_humano_id;

  const debeReconciliar =
    !payloadTieneCampoResponsable(command) &&
    detectarInvalidacionPorCambioMacroarea(
      actual.responsable_humano_id,
      null,
      caso.macroarea_actual
    );

  let siguiente: AsignacionActual;

  if (!payloadTieneCampoResponsable(command) && !debeReconciliar) {
    result.ok = true;
    result.advertencias.push({
      caso_id: command.caso_id,
      codigo: "sin_cambios",
      mensaje: "No hay cambios efectivos en la asignación humana.",
    });
    return result;
  }

  if (debeReconciliar || responsableIdSolicitado === null) {
    siguiente = limpiarAsignacion();
  } else {
    const validacion = validarAsignacionPersona(
      responsableIdSolicitado,
      caso.macroarea_actual
    );

    if (!validacion.ok) {
      result.errores.push({
        caso_id: command.caso_id,
        codigo: "responsable_humano_invalido",
        mensaje:
          validacion.motivo ??
          "La persona solicitada no es válida para la macroárea actual del caso.",
      });
      return result;
    }

    siguiente = {
      responsable_humano_id: validacion.personaId,
      responsable_humano_nombre: validacion.personaNombre,
      responsable_humano_asignado_por: actor,
      responsable_humano_asignado_at: timestamp,
    };
  }

  const cambios = construirCambios(actual, siguiente);
  if (!cambios.length) {
    result.ok = true;
    result.advertencias.push({
      caso_id: command.caso_id,
      codigo: "sin_cambios",
      mensaje: "No hay cambios efectivos en la asignación humana.",
    });
    return result;
  }

  const { data, error } = await supabase
    .from("casos")
    .update(siguiente)
    .eq("id", command.caso_id)
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "asignacion_humana_error",
      mensaje: "No se pudo guardar la asignación humana del caso.",
    });
    return result;
  }

  result.ok = true;
  result.cambios = cambios;

  await registrarBitacora(
    construirBitacora(command.caso_id, actor, cambios),
    result,
    supabase
  );

  return result;
}
