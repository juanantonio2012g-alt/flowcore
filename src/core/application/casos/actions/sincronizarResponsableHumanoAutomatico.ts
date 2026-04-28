import { obtenerPersonaPredeterminadaParaMacroarea } from "@/core/domain/personas/catalogo-personas";
import { validarAsignacionPersona } from "@/core/domain/personas/validar-asignacion";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionWarning } from "./contracts";
import type { QuickUpdateChange } from "./contracts";
import { executeAsignarResponsableHumano } from "./executeAsignarResponsableHumano";
import { getCasoNormalizadoById } from "../useCases/getCasoNormalizadoById";

type AsignacionActual = {
  responsable_humano_id: string | null;
  responsable_humano_nombre: string | null;
  responsable_humano_asignado_por: string | null;
  responsable_humano_asignado_at: string | null;
};

type SincronizarResponsableHumanoAutomaticoArgs = {
  caso_id: string;
  actor?: string | null;
  supabase?: SupabaseClient;
};

type SincronizarResponsableHumanoAutomaticoResult = {
  ok: boolean;
  cambios_aplicados: boolean;
  cambios: QuickUpdateChange[];
  advertencias: ActionWarning[];
};

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

export async function sincronizarResponsableHumanoAutomatico(
  args: SincronizarResponsableHumanoAutomaticoArgs
): Promise<SincronizarResponsableHumanoAutomaticoResult> {
  const supabase = args.supabase ?? createServerSupabaseClient();
  const actor =
    normalizarTextoNullable(args.actor) ?? "OpenCore Autoassign";
  const caso = await getCasoNormalizadoById(args.caso_id);

  if (!caso) {
    return {
      ok: false,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [
        {
          caso_id: args.caso_id,
          codigo: "responsable_humano_autoasignacion_sin_caso",
          mensaje:
            "No se pudo sincronizar la asignación humana automática porque el caso ya no está disponible.",
        },
      ],
    };
  }

  const personaPredeterminada = obtenerPersonaPredeterminadaParaMacroarea(
    caso.macroarea_actual
  );

  if (!personaPredeterminada) {
    return {
      ok: false,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [
        {
          caso_id: args.caso_id,
          codigo: "responsable_humano_catalogo_incompleto",
          mensaje:
            "No existe una persona predeterminada para la macroárea actual del caso.",
        },
      ],
    };
  }

  let asignacionActual: AsignacionActual | null;
  try {
    asignacionActual = await obtenerAsignacionActual(args.caso_id, supabase);
  } catch {
    return {
      ok: false,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [
        {
          caso_id: args.caso_id,
          codigo: "responsable_humano_autoasignacion_no_verificada",
          mensaje:
            "No se pudo verificar la asignación humana automática con la conexión actual del caso.",
        },
      ],
    };
  }

  if (!asignacionActual) {
    return {
      ok: false,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [
        {
          caso_id: args.caso_id,
          codigo: "responsable_humano_autoasignacion_sin_registro",
          mensaje:
            "No se pudo leer el registro base del caso para sincronizar la asignación humana.",
        },
      ],
    };
  }

  const asignacionActualValida = validarAsignacionPersona(
    asignacionActual.responsable_humano_id,
    caso.macroarea_actual
  );
  const metadataIncompleta =
    asignacionActualValida.ok &&
    !!asignacionActual.responsable_humano_id &&
    (!asignacionActual.responsable_humano_nombre ||
      !asignacionActual.responsable_humano_asignado_por ||
      !asignacionActual.responsable_humano_asignado_at);

  if (
    asignacionActualValida.ok &&
    !!asignacionActual.responsable_humano_id &&
    !metadataIncompleta
  ) {
    return {
      ok: true,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [],
    };
  }

  const responsableObjetivoId =
    asignacionActualValida.ok && asignacionActual.responsable_humano_id
      ? asignacionActual.responsable_humano_id
      : personaPredeterminada.id;

  let result;
  try {
    result = await executeAsignarResponsableHumano(
      {
        caso_id: args.caso_id,
        payload: {
          responsable_humano_id: responsableObjetivoId,
        },
        actor,
      },
      { supabase }
    );
  } catch {
    return {
      ok: false,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [
        {
          caso_id: args.caso_id,
          codigo: "responsable_humano_autoasignacion_no_aplicada",
          mensaje:
            "No se pudo aplicar la autoasignación humana con la conexión actual del caso.",
        },
      ],
    };
  }

  return {
    ok: result.ok,
    cambios_aplicados: result.cambios.length > 0,
    cambios: result.cambios,
    advertencias: result.advertencias.filter(
      (advertencia) => advertencia.codigo !== "sin_cambios"
    ),
  };
}
