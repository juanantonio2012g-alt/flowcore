import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasoNormalizadoById } from "../useCases/getCasoNormalizadoById";
import type { CasoNormalizado } from "@/core/domain/casos";
import {
  inferirEstadoComercialDesdeAccion,
  normalizarTextoNullable,
} from "@/core/domain/casos/rules";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  QuickUpdateChange,
  QuickUpdateCommand,
  QuickUpdateResult,
} from "./contracts";
import { sincronizarResponsableHumanoAutomatico } from "./sincronizarResponsableHumanoAutomatico";
import { validateQuickUpdateCommand } from "./quickUpdateValidators";

type BitacoraPayload = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor: string;
};

type ExecuteQuickUpdateOptions = {
  supabase?: SupabaseClient;
};

function crearResultadoBase(command: QuickUpdateCommand): QuickUpdateResult {
  return {
    ok: false,
    caso_id: command.caso_id,
    accion: command.accion,
    cambios: [],
    errores: [],
    advertencias: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore-quick-update",
    },
  };
}

async function registrarBitacora(
  rows: BitacoraPayload[],
  advertencias: QuickUpdateResult["advertencias"],
  supabase: SupabaseClient
) {
  if (!rows.length) return;

  const { error } = await supabase.from("bitacora_cambios_caso").insert(rows);

  if (error) {
    advertencias.push({
      caso_id: rows[0]?.caso_id,
      codigo: "bitacora_no_registrada",
      mensaje: "La actualización se aplicó, pero no se pudo registrar en bitácora.",
    });
  }
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDiasIso(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function resolverFechaSugerida(caso: CasoNormalizado) {
  const fecha = caso.recomendacion_operativa.fecha_sugerida;
  if (fecha) return fecha.slice(0, 10);
  if (caso.recomendacion_operativa.urgencia === "alta") return hoyIso();
  if (caso.recomendacion_operativa.urgencia === "media") return sumarDiasIso(1);
  return caso.proxima_fecha ? caso.proxima_fecha.slice(0, 10) : "";
}

function construirCambios(
  caso: CasoNormalizado,
  payload: {
    proxima_accion: string | null;
    proxima_fecha: string | null;
    estado_comercial: string | null;
  }
): QuickUpdateChange[] {
  const cambios: QuickUpdateChange[] = [];

  if ((caso.proxima_accion ?? "") !== (payload.proxima_accion ?? "")) {
    cambios.push({
      campo: "proxima_accion",
      anterior: caso.proxima_accion,
      nuevo: payload.proxima_accion,
    });
  }

  if ((caso.proxima_fecha ?? "") !== (payload.proxima_fecha ?? "")) {
    cambios.push({
      campo: "proxima_fecha",
      anterior: caso.proxima_fecha,
      nuevo: payload.proxima_fecha,
    });
  }

  if (
    (caso.metadata.estado_comercial_real ?? "") !==
    (payload.estado_comercial ?? "")
  ) {
    cambios.push({
      campo: "estado_comercial",
      anterior: caso.metadata.estado_comercial_real,
      nuevo: payload.estado_comercial,
    });
  }

  return cambios;
}

function construirBitacora(
  casoId: string,
  actor: string,
  accion: QuickUpdateCommand["accion"],
  cambios: QuickUpdateChange[]
): BitacoraPayload[] {
  const origen = accion === "aplicar_sugerencia" ? "sugerido" : "manual";

  return cambios.map((cambio) => ({
    caso_id: casoId,
    campo: cambio.campo,
    valor_anterior: cambio.anterior ?? null,
    valor_nuevo: cambio.nuevo ?? null,
    origen,
    actor,
  }));
}

function construirPayloadManual(
  command: QuickUpdateCommand
) {
  return {
    proxima_accion:
      normalizarTextoNullable(command.payload?.proxima_accion) ?? null,
    proxima_fecha: command.payload?.proxima_fecha ?? null,
    estado_comercial:
      normalizarTextoNullable(command.payload?.estado_comercial) ?? null,
  };
}

function construirPayloadSugerido(caso: CasoNormalizado) {
  const accion = normalizarTextoNullable(caso.recomendacion_operativa.accion);
  return {
    proxima_accion: accion,
    proxima_fecha: resolverFechaSugerida(caso) || null,
    estado_comercial:
      inferirEstadoComercialDesdeAccion(
        accion,
        caso.metadata.estado_comercial_real
      ) ?? null,
  };
}

export async function executeQuickUpdate(
  command: QuickUpdateCommand,
  options: ExecuteQuickUpdateOptions = {}
): Promise<QuickUpdateResult> {
  const result = crearResultadoBase(command);
  const caso = await getCasoNormalizadoById(command.caso_id);
  const supabase = options.supabase ?? createServerSupabaseClient();
  const validation = validateQuickUpdateCommand(command, caso);

  if (!validation.ok || !caso) {
    result.errores = validation.errores;
    result.advertencias = validation.advertencias;
    return result;
  }

  const actor = normalizarTextoNullable(command.actor) ?? "sistema";
  const payload =
    command.accion === "aplicar_sugerencia"
      ? construirPayloadSugerido(caso)
      : construirPayloadManual(command);

  const cambios = construirCambios(caso, payload);

  if (!cambios.length) {
    result.ok = true;
    result.cambios = [];
    result.advertencias = [
      ...validation.advertencias,
      {
        caso_id: command.caso_id,
        codigo: "sin_cambios",
        mensaje: "No hay cambios efectivos para aplicar.",
      },
    ];
    return result;
  }

  const { data: updatedCase, error } = await supabase
    .from("casos")
    .update(payload)
    .eq("id", command.caso_id)
    .select("id")
    .maybeSingle();

  if (error) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "quick_update_error",
      mensaje:
        command.accion === "aplicar_sugerencia"
          ? "No se pudo aplicar la sugerencia."
          : "No se pudo guardar la actualización.",
    });
    return result;
  }

  if (!updatedCase?.id) {
    result.errores.push({
      caso_id: command.caso_id,
      codigo: "quick_update_error",
      mensaje:
        "No se pudo guardar la actualización. Verifica permisos o que el caso exista.",
    });
    return result;
  }

  result.advertencias = [...validation.advertencias];
  const autoasignacion = await sincronizarResponsableHumanoAutomatico({
    caso_id: command.caso_id,
    actor,
    supabase,
  });
  result.advertencias.push(...autoasignacion.advertencias);

  result.ok = true;
  result.cambios = [...cambios, ...autoasignacion.cambios];

  await registrarBitacora(
    construirBitacora(command.caso_id, actor, command.accion, result.cambios),
    result.advertencias,
    supabase
  );

  return result;
}
