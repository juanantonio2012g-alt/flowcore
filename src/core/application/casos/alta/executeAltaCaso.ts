import { createServerSupabaseClient } from "@/lib/supabase/server";
import { crearCasoLocalDeDesarrollo } from "@/lib/dev/casos-local-store";
import {
  construirMensajeErrorConectividadSupabase,
  esErrorConectividadSupabase,
} from "@/lib/supabase/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clasificarCasoInicial } from "./clasificacionInicial";
import {
  MENSAJE_CONTENIDO_MINIMO_ALTA_CASO,
  tieneDescripcionMinimaAltaCaso,
} from "./minimoOperativo";
import { sincronizarResponsableHumanoAutomatico } from "../actions/sincronizarResponsableHumanoAutomatico";

export type AltaCasoCommand = {
  cliente?: string | null;
  proyecto?: string | null;
  canal?: string | null;
  prioridad?: string | null;
  descripcion?: string | null;
  actor?: string | null;
};

export type AltaCasoIssue = {
  codigo: string;
  mensaje: string;
  campo?: string;
  severidad: "info" | "warning" | "error";
};

export type AltaCasoDecision = "crear" | "bloquear" | "revision_manual";

export type AltaCasoResult = {
  ok: boolean;
  decision: AltaCasoDecision;
  caso_id: string | null;
  cliente_id: string | null;
  errores: AltaCasoIssue[];
  metadata: {
    timestamp: string;
    origen: string;
    etapa_actual:
      | "recepcion"
      | "normalizacion"
      | "alineamiento"
      | "control_flujo"
      | "ejecucion"
      | "registro";
    requiere_revision: boolean;
    criterios_aplicados: string[];
    señales_detectadas: string[];
    input_normalizado: NormalizedAltaCasoCommand;
  };
};

type ClienteExistente = {
  id: string;
  nombre: string;
  empresa: string | null;
};

type ExecuteAltaCasoOptions = {
  supabase?: SupabaseClient;
};

type NormalizedAltaCasoCommand = {
  cliente: string | null;
  proyecto: string | null;
  canal: string;
  prioridad: string;
  descripcion: string | null;
  actor: string | null;
};

const ORIGEN = "executeAltaCaso";

function clean(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/\s+/g, " ");
  return v || null;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCanal(value?: string | null): { value: string; inferred: boolean } {
  const raw = clean(value);
  if (!raw) return { value: "no_declarado", inferred: true };

  const map: Record<string, string> = {
    whatsapp: "whatsapp",
    telefono: "telefono",
    phone: "telefono",
    llamada: "telefono",
    correo: "correo",
    email: "correo",
    mail: "correo",
    presencial: "presencial",
    web: "web",
    formulario: "web",
  };

  return { value: map[normalizeText(raw)] ?? normalizeText(raw), inferred: false };
}

function normalizePrioridad(value?: string | null): { value: string; inferred: boolean } {
  const raw = clean(value);
  if (!raw) return { value: "media", inferred: true };

  const map: Record<string, string> = {
    baja: "baja",
    media: "media",
    normal: "media",
    alta: "alta",
    urgente: "alta",
    critica: "critica",
    crítica: "critica",
    p1: "critica",
    p2: "alta",
    p3: "media",
    p4: "baja",
  };

  return { value: map[normalizeText(raw)] ?? normalizeText(raw), inferred: false };
}

function normalizeCommand(command: AltaCasoCommand): {
  input: NormalizedAltaCasoCommand;
  señales: string[];
  criterios: string[];
} {
  const canal = normalizeCanal(command.canal);
  const prioridad = normalizePrioridad(command.prioridad);
  const señales: string[] = [];
  const criterios = ["normalizacion_base"];

  if (canal.inferred) señales.push("canal_no_declarado");
  if (prioridad.inferred) señales.push("prioridad_no_declarada");

  return {
    input: {
      cliente: clean(command.cliente),
      proyecto: clean(command.proyecto),
      canal: canal.value,
      prioridad: prioridad.value,
      descripcion: clean(command.descripcion),
      actor: clean(command.actor),
    },
    señales,
    criterios,
  };
}

function evaluateInput(input: NormalizedAltaCasoCommand): {
  decision: AltaCasoDecision;
  issues: AltaCasoIssue[];
  señales: string[];
  criterios: string[];
} {
  const issues: AltaCasoIssue[] = [];
  const señales: string[] = [];
  const criterios = ["bloqueo_ante_falta_de_base"];

  if (!input.cliente) {
    issues.push({
      codigo: "CLIENTE_REQUERIDO",
      mensaje: "No se puede abrir el caso sin cliente declarado.",
      campo: "cliente",
      severidad: "error",
    });
    señales.push("falta_cliente");
  }

  if (!input.descripcion) {
    issues.push({
      codigo: "DESCRIPCION_REQUERIDA",
      mensaje: "No se puede abrir el caso sin descripción.",
      campo: "descripcion",
      severidad: "error",
    });
    señales.push("falta_descripcion");
  } else if (!tieneDescripcionMinimaAltaCaso(input.descripcion)) {
    issues.push({
      codigo: "DESCRIPCION_INSUFICIENTE",
      mensaje: MENSAJE_CONTENIDO_MINIMO_ALTA_CASO,
      campo: "descripcion",
      severidad: "error",
    });
    señales.push("descripcion_insuficiente");
  }

  if (!input.actor) {
    issues.push({
      codigo: "ACTOR_NO_DECLARADO",
      mensaje: "El actor no fue declarado. Se permite continuar, pero queda registrado.",
      campo: "actor",
      severidad: "warning",
    });
    señales.push("actor_no_declarado");
  }

  if (input.canal === "no_declarado") {
    issues.push({
      codigo: "CANAL_NO_DECLARADO",
      mensaje: "El canal no fue declarado. Se conserva como no_declarado.",
      campo: "canal",
      severidad: "warning",
    });
    señales.push("canal_no_declarado");
  }

  const hasErrors = issues.some((issue) => issue.severidad === "error");

  return {
    decision: hasErrors ? "bloquear" : "crear",
    issues,
    señales,
    criterios,
  };
}

async function resolveCliente(
  supabase: SupabaseClient,
  nombreCliente: string,
): Promise<{
  decision: AltaCasoDecision;
  cliente: ClienteExistente | null;
  issues: AltaCasoIssue[];
  señales: string[];
  criterios: string[];
}> {
  const issues: AltaCasoIssue[] = [];
  const señales: string[] = [];
  const criterios = ["control_de_ambiguedad_cliente"];
  const target = normalizeText(nombreCliente);

  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, empresa")
    .limit(100);

  if (error) {
    if (esErrorConectividadSupabase(error)) {
      throw new Error(
        construirMensajeErrorConectividadSupabase(
          "la consulta de clientes",
          error
        )
      );
    }

    throw new Error(`No se pudo consultar clientes: ${error.message}`);
  }

  const clientes = (data ?? []) as ClienteExistente[];
  const exact = clientes.filter((c) => normalizeText(c.nombre) === target);

  if (exact.length === 1) {
    criterios.push("cliente_existente_exacto");
    return { decision: "crear", cliente: exact[0], issues, señales, criterios };
  }

  if (exact.length > 1) {
    issues.push({
      codigo: "CLIENTE_DUPLICADO",
      mensaje: "Hay múltiples clientes con coincidencia exacta. Se bloquea para evitar asociación incorrecta.",
      campo: "cliente",
      severidad: "error",
    });
    señales.push("cliente_duplicado_exacto");
    criterios.push("bloqueo_por_duplicado");
    return { decision: "bloquear", cliente: null, issues, señales, criterios };
  }

  const partial = clientes.filter((c) => {
    const current = normalizeText(c.nombre);
    return current.includes(target) || target.includes(current);
  });

  if (partial.length === 1) {
    criterios.push("cliente_existente_parcial_controlado");
    return { decision: "crear", cliente: partial[0], issues, señales, criterios };
  }

  if (partial.length > 1) {
    issues.push({
      codigo: "CLIENTE_AMBIGUO",
      mensaje: "Existen múltiples coincidencias parciales. Se requiere revisión manual.",
      campo: "cliente",
      severidad: "warning",
    });
    señales.push("cliente_ambiguo");
    criterios.push("revision_manual_por_ambiguedad");
    return { decision: "revision_manual", cliente: null, issues, señales, criterios };
  }

  const { data: creado, error: createError } = await supabase
    .from("clientes")
    .insert({ nombre: toTitleCase(nombreCliente), empresa: null })
    .select("id, nombre, empresa")
    .single();

  if (createError || !creado) {
    if (esErrorConectividadSupabase(createError)) {
      throw new Error(
        construirMensajeErrorConectividadSupabase(
          "la creación del cliente",
          createError
        )
      );
    }

    throw new Error(`No se pudo crear el cliente: ${createError?.message ?? "sin detalle"}`);
  }

  señales.push("cliente_creado");
  criterios.push("cliente_nuevo_creado");

  return {
    decision: "crear",
    cliente: creado as ClienteExistente,
    issues,
    señales,
    criterios,
  };
}

function buildResult(params: {
  ok: boolean;
  decision: AltaCasoDecision;
  caso_id: string | null;
  cliente_id: string | null;
  errores: AltaCasoIssue[];
  etapa_actual: AltaCasoResult["metadata"]["etapa_actual"];
  criterios_aplicados: string[];
  señales_detectadas: string[];
  input_normalizado: NormalizedAltaCasoCommand;
  timestamp: string;
}): AltaCasoResult {
  return {
    ok: params.ok,
    decision: params.decision,
    caso_id: params.caso_id,
    cliente_id: params.cliente_id,
    errores: params.errores,
    metadata: {
      timestamp: params.timestamp,
      origen: ORIGEN,
      etapa_actual: params.etapa_actual,
      requiere_revision: params.decision === "revision_manual",
      criterios_aplicados: [...new Set(params.criterios_aplicados)],
      señales_detectadas: [...new Set(params.señales_detectadas)],
      input_normalizado: params.input_normalizado,
    },
  };
}

export async function executeAltaCaso(
  command: AltaCasoCommand,
  options: ExecuteAltaCasoOptions = {},
): Promise<AltaCasoResult> {
  const timestamp = new Date().toISOString();
  const supabase = options.supabase ?? (await createServerSupabaseClient());
  let inputNormalizado: NormalizedAltaCasoCommand | null = null;
  let advertenciasBase: AltaCasoIssue[] = [];
  let clasificacionInicial: ReturnType<typeof clasificarCasoInicial> | null = null;

  let etapa_actual: AltaCasoResult["metadata"]["etapa_actual"] = "recepcion";
  const criterios = ["recepcion_input"];
  const señales = ["input_recibido"];

  try {
    etapa_actual = "normalizacion";
    const { input, señales: señalesNorm, criterios: criteriosNorm } = normalizeCommand(command);
    inputNormalizado = input;
    señales.push(...señalesNorm);
    criterios.push(...criteriosNorm);

    etapa_actual = "alineamiento";
    const base = evaluateInput(input);
    advertenciasBase = base.issues.filter((issue) => issue.severidad !== "error");
    señales.push(...base.señales);
    criterios.push(...base.criterios);

    if (base.decision === "bloquear") {
      return buildResult({
        ok: false,
        decision: "bloquear",
        caso_id: null,
        cliente_id: null,
        errores: base.issues,
        etapa_actual,
        criterios_aplicados: criterios,
        señales_detectadas: señales,
        input_normalizado: input,
        timestamp,
      });
    }

    etapa_actual = "control_flujo";
    const clienteResult = await resolveCliente(supabase, input.cliente!);
    señales.push(...clienteResult.señales);
    criterios.push(...clienteResult.criterios);

    const issues = [...base.issues, ...clienteResult.issues];

    if (clienteResult.decision !== "crear" || !clienteResult.cliente) {
      return buildResult({
        ok: false,
        decision: clienteResult.decision,
        caso_id: null,
        cliente_id: null,
        errores: issues,
        etapa_actual,
        criterios_aplicados: criterios,
        señales_detectadas: señales,
        input_normalizado: input,
        timestamp,
      });
    }

    etapa_actual = "ejecucion";
    const clasificacion = clasificarCasoInicial({
      canal: input.canal,
      prioridad: input.prioridad as "urgente" | "alta" | "media" | "baja" | null,
      descripcion: input.descripcion,
    });
    clasificacionInicial = clasificacion;

    const { data: caso, error: casoError } = await supabase
      .from("casos")
      .insert({
        cliente_id: clienteResult.cliente.id,
        canal_entrada: input.canal,
        tipo_solicitud: clasificacion.tipo_solicitud,
        descripcion_inicial: input.descripcion,
        proxima_accion: clasificacion.proxima_accion,
        prioridad: input.prioridad,
        estado: "solicitud_recibida",
        creado_por: input.actor,
      })
      .select("id")
      .single();

    if (casoError || !caso) {
      if (esErrorConectividadSupabase(casoError)) {
        throw new Error(
          construirMensajeErrorConectividadSupabase(
            "la creación del caso",
            casoError
          )
        );
      }

      throw new Error(`No se pudo crear el caso: ${casoError?.message ?? "sin detalle"}`);
    }

    etapa_actual = "registro";
    señales.push("caso_creado");
    criterios.push("alta_caso_ejecutada");
    const autoasignacion = await sincronizarResponsableHumanoAutomatico({
      caso_id: caso.id,
      actor: input.actor,
      supabase,
    });
    const advertenciasAutoasignacion = autoasignacion.advertencias.map(
      (advertencia) => ({
        codigo: advertencia.codigo,
        mensaje: advertencia.mensaje,
        severidad: "warning" as const,
      })
    );

    return buildResult({
      ok: true,
      decision: "crear",
      caso_id: caso.id,
      cliente_id: clienteResult.cliente.id,
      errores: [...issues, ...advertenciasAutoasignacion],
      etapa_actual,
      criterios_aplicados: criterios,
      señales_detectadas: señales,
      input_normalizado: input,
      timestamp,
    });
  } catch (error) {
    const fallback = inputNormalizado ?? normalizeCommand(command).input;

    if (
      esErrorConectividadSupabase(error) &&
      process.env.NODE_ENV === "development" &&
      fallback.cliente &&
      fallback.descripcion &&
      fallback.prioridad
    ) {
      try {
        const clasificacion =
          clasificacionInicial ??
          clasificarCasoInicial({
            canal: fallback.canal,
            prioridad: fallback.prioridad as "urgente" | "alta" | "media" | "baja" | null,
            descripcion: fallback.descripcion,
          });
        const local = await crearCasoLocalDeDesarrollo({
          cliente: fallback.cliente,
          proyecto: fallback.proyecto,
          prioridad: fallback.prioridad as "urgente" | "alta" | "media" | "baja",
          descripcion: fallback.descripcion,
          clasificacion,
          timestamp,
        });

        etapa_actual = "registro";
        señales.push("caso_local_dev_creado");
        criterios.push("fallback_local_dev_por_supabase");

        return buildResult({
          ok: true,
          decision: "crear",
          caso_id: local.casoId,
          cliente_id: local.clienteId,
          errores: [
            ...advertenciasBase,
            {
              codigo: "ALTA_CASO_LOCAL_DEV",
              mensaje:
                "OpenCore guardó el caso en almacenamiento local de desarrollo porque Supabase no estaba disponible.",
              severidad: "warning",
            },
          ],
          etapa_actual,
          criterios_aplicados: criterios,
          señales_detectadas: señales,
          input_normalizado: fallback,
          timestamp,
        });
      } catch (localError) {
        console.error("alta_caso_local_dev_fallback_error", localError);
      }
    }

    return buildResult({
      ok: false,
      decision: "bloquear",
      caso_id: null,
      cliente_id: null,
      errores: [
        {
          codigo: "ALTA_CASO_ERROR",
          mensaje: error instanceof Error ? error.message : "Ocurrió un error inesperado durante el alta del caso.",
          severidad: "error",
        },
      ],
      etapa_actual,
      criterios_aplicados: criterios,
      señales_detectadas: [...señales, "error_no_controlado"],
      input_normalizado: fallback,
      timestamp,
    });
  }
}
