import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { HostCasoBaseRecord } from "@/core/application/casos/adapter/mapCasoFromHost";
import type { ClasificacionInicialOutput } from "@/core/application/casos/alta";
import { derivarContinuidadInicialCaso } from "@/core/application/casos/alta";

type LocalCasosStore = {
  version: 1;
  casos: HostCasoBaseRecord[];
};

function obtenerRutaStoreLocal() {
  return (
    process.env.OPENCORE_LOCAL_DEV_STORE_PATH ??
    path.join(process.cwd(), "tmp", "opencore-local-casos.json")
  );
}

function fallbackLocalHabilitado() {
  return process.env.NODE_ENV === "development";
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizarTexto(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function leerStoreLocal(): Promise<LocalCasosStore> {
  if (!fallbackLocalHabilitado()) {
    return { version: 1, casos: [] };
  }

  const ruta = obtenerRutaStoreLocal();

  try {
    const contenido = await readFile(ruta, "utf8");
    const parsed = JSON.parse(contenido) as Partial<LocalCasosStore> | null;

    if (!parsed || !Array.isArray(parsed.casos)) {
      return { version: 1, casos: [] };
    }

    return {
      version: 1,
      casos: parsed.casos as HostCasoBaseRecord[],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, casos: [] };
    }

    throw error;
  }
}

async function guardarStoreLocal(store: LocalCasosStore) {
  const ruta = obtenerRutaStoreLocal();
  await mkdir(path.dirname(ruta), { recursive: true });
  await writeFile(ruta, JSON.stringify(store, null, 2), "utf8");
}

function derivarEstadoTecnicoInicial(
  clasificacion: ClasificacionInicialOutput
) {
  if (clasificacion.grupo === "logistica") {
    return "solucion_definida";
  }

  return null;
}

function derivarEstadoComercialInicial(
  clasificacion: ClasificacionInicialOutput
) {
  if (clasificacion.grupo === "comercial") {
    return "en_proceso";
  }

  if (clasificacion.grupo === "logistica") {
    return "aprobado";
  }

  if (clasificacion.grupo === "postventa") {
    return "cerrado_ganado";
  }

  return null;
}

export async function listarCasosLocalesDeDesarrollo() {
  const store = await leerStoreLocal();

  return [...store.casos].sort((a, b) => {
    const fechaA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const fechaB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return fechaB - fechaA;
  });
}

export async function obtenerCasoLocalDeDesarrolloPorId(id: string) {
  const store = await leerStoreLocal();
  return store.casos.find((caso) => caso.id === id) ?? null;
}

export async function crearCasoLocalDeDesarrollo(args: {
  cliente: string;
  proyecto?: string | null;
  prioridad: "urgente" | "alta" | "media" | "baja";
  descripcion: string;
  clasificacion: ClasificacionInicialOutput;
  timestamp: string;
}) {
  const store = await leerStoreLocal();
  const clienteNormalizado = normalizarTexto(args.cliente);
  const proyecto = (args.proyecto ?? "").trim() || null;
  const clienteExistente = store.casos.find((caso) => {
    const actual = Array.isArray(caso.clientes) ? caso.clientes[0] : caso.clientes;

    if (!actual) {
      return false;
    }

    return (
      normalizarTexto(actual.nombre) === clienteNormalizado &&
      normalizarTexto(actual.empresa) === normalizarTexto(proyecto)
    );
  });

  const clienteId =
    clienteExistente?.cliente_id ?? `local-cliente-${randomUUID()}`;
  const continuidad = derivarContinuidadInicialCaso({
    prioridad: args.prioridad,
  });
  const casoId = `local-caso-${randomUUID()}`;
  const cliente = {
    id: clienteId,
    nombre: toTitleCase(args.cliente),
    empresa: proyecto,
  };

  const caso: HostCasoBaseRecord = {
    id: casoId,
    prioridad: args.prioridad,
    created_at: args.timestamp,
    estado_tecnico: derivarEstadoTecnicoInicial(args.clasificacion),
    estado_comercial: derivarEstadoComercialInicial(args.clasificacion),
    proxima_accion: args.clasificacion.proxima_accion || continuidad.proxima_accion,
    proxima_fecha: continuidad.proxima_fecha,
    tipo_solicitud: args.clasificacion.tipo_solicitud,
    nivel_confianza_cliente: null,
    nivel_friccion_cliente: null,
    desgaste_operativo: null,
    claridad_intencion: null,
    probabilidad_conversion: null,
    observacion_relacional:
      `Caso registrado en almacenamiento local de desarrollo por indisponibilidad de Supabase. ${args.descripcion}`,
    cliente_id: clienteId,
    clientes: cliente,
  };

  await guardarStoreLocal({
    version: 1,
    casos: [caso, ...store.casos],
  });

  return {
    casoId,
    clienteId,
    caso,
  };
}
