import { obtenerMetaMacroarea } from "./macroarea";
import type { MacroareaCaso } from "./types";

export type SenalDelegacion = "baja" | "media" | "alta";

export type CasoMacroareaSignalInput = {
  id: string;
  macroarea_actual: MacroareaCaso;
  estado_comercial_real: string;
  proxima_accion_real: string;
  proxima_fecha_real: string | null;
  riesgo: "alto" | "medio" | "bajo";
  requiere_validacion: boolean;
  created_at: string | null;
};

export type SenalesMacroarea = {
  macroarea: MacroareaCaso;
  macroarea_label: string;
  macroarea_orden: number;
  casosTotales: number;
  casosActivos: number;
  casosVencidos: number;
  casosBloqueados: number;
  casosSinProximaAccion: number;
  casosSinProximaFecha: number;
  casosConContinuidadRota: number;
  casosConRiesgoAlto: number;
  casosConMovimientoReciente: number;
  senalDelegacion: SenalDelegacion;
  senalDelegacionMotivo: string;
};

export type SenalesMacroareaOutput = {
  resumen: SenalesMacroarea[];
  porMacroarea: Record<MacroareaCaso, SenalesMacroarea>;
  totalCasos: number;
  totalActivos: number;
};

type CalcularSenalesMacroareaOptions<T extends CasoMacroareaSignalInput> = {
  fechaReferenciaIso?: string;
  esMovimientoReciente?: (caso: T) => boolean;
};

function esEstadoActivo(estadoComercialReal: string) {
  return estadoComercialReal !== "aprobado" && estadoComercialReal !== "rechazado";
}

function esSinProximaAccion(proximaAccionReal: string) {
  const accion = (proximaAccionReal ?? "").trim().toLowerCase();
  return !accion || accion === "sin próxima acción" || accion === "sin proxima accion";
}

function esSinProximaFecha(proximaFechaReal: string | null) {
  return !proximaFechaReal;
}

function esVencido(
  proximaFechaReal: string | null,
  fechaReferenciaIso: string,
  estadoComercialReal: string
) {
  if (!proximaFechaReal) return false;
  if (!esEstadoActivo(estadoComercialReal)) return false;
  return proximaFechaReal.slice(0, 10) < fechaReferenciaIso;
}

function esMovimientoRecienteHeuristico(caso: CasoMacroareaSignalInput, fechaReferenciaIso: string) {
  const estado = caso.estado_comercial_real;
  if (
    estado === "sin_cotizar" ||
    estado === "en_proceso" ||
    estado === "negociacion" ||
    estado === "cotizado"
  ) {
    return true;
  }

  if (!caso.created_at) return false;
  const ref = new Date(`${fechaReferenciaIso}T00:00:00.000Z`).getTime();
  const created = new Date(caso.created_at).getTime();
  if (!Number.isFinite(ref) || !Number.isFinite(created)) return false;
  const dias = (ref - created) / (1000 * 60 * 60 * 24);
  return dias >= 0 && dias <= 14;
}

function calcularSenalDelegacion(entrada: {
  casosActivos: number;
  casosVencidos: number;
  casosBloqueados: number;
  casosConContinuidadRota: number;
  casosConRiesgoAlto: number;
  casosSinProximaAccion: number;
  casosSinProximaFecha: number;
}) {
  const score =
    entrada.casosVencidos * 3 +
    entrada.casosBloqueados * 2 +
    entrada.casosConContinuidadRota * 2 +
    entrada.casosConRiesgoAlto * 2 +
    entrada.casosSinProximaAccion +
    entrada.casosSinProximaFecha +
    Math.max(entrada.casosActivos - 4, 0);

  if (
    score >= 16 ||
    entrada.casosActivos >= 12 ||
    (entrada.casosVencidos >= 3 && entrada.casosBloqueados >= 3)
  ) {
    return {
      nivel: "alta" as const,
      motivo:
        "Alta presión: concentración de vencimientos/bloqueos o carga activa elevada.",
    };
  }

  if (score >= 8 || entrada.casosActivos >= 5 || entrada.casosConContinuidadRota >= 2) {
    return {
      nivel: "media" as const,
      motivo: "Presión media: fricción operativa presente con carga relevante.",
    };
  }

  return {
    nivel: "baja" as const,
    motivo: "Carga controlada y sin señales críticas acumuladas.",
  };
}

function crearVacia(area: MacroareaCaso): SenalesMacroarea {
  const meta = obtenerMetaMacroarea(area);
  return {
    macroarea: area,
    macroarea_label: meta.label,
    macroarea_orden: meta.orden,
    casosTotales: 0,
    casosActivos: 0,
    casosVencidos: 0,
    casosBloqueados: 0,
    casosSinProximaAccion: 0,
    casosSinProximaFecha: 0,
    casosConContinuidadRota: 0,
    casosConRiesgoAlto: 0,
    casosConMovimientoReciente: 0,
    senalDelegacion: "baja",
    senalDelegacionMotivo: "Sin carga registrada.",
  };
}

export function calcularSenalesMacroarea<T extends CasoMacroareaSignalInput>(
  casos: T[],
  options: CalcularSenalesMacroareaOptions<T> = {}
): SenalesMacroareaOutput {
  const fechaReferenciaIso = options.fechaReferenciaIso ?? new Date().toISOString().slice(0, 10);
  const porMacroarea: Record<MacroareaCaso, SenalesMacroarea> = {
    operaciones: crearVacia("operaciones"),
    tecnico: crearVacia("tecnico"),
    comercial: crearVacia("comercial"),
    administracion: crearVacia("administracion"),
  };

  for (const caso of casos) {
    const bucket = porMacroarea[caso.macroarea_actual];
    const sinProximaAccion = esSinProximaAccion(caso.proxima_accion_real);
    const sinProximaFecha = esSinProximaFecha(caso.proxima_fecha_real);
    const continuidadRota = sinProximaAccion || sinProximaFecha;
    const vencido = esVencido(caso.proxima_fecha_real, fechaReferenciaIso, caso.estado_comercial_real);
    const bloqueado = caso.riesgo === "alto" || caso.requiere_validacion || continuidadRota;
    const movimientoReciente = options.esMovimientoReciente
      ? options.esMovimientoReciente(caso)
      : esMovimientoRecienteHeuristico(caso, fechaReferenciaIso);

    bucket.casosTotales += 1;
    if (esEstadoActivo(caso.estado_comercial_real)) bucket.casosActivos += 1;
    if (vencido) bucket.casosVencidos += 1;
    if (bloqueado) bucket.casosBloqueados += 1;
    if (sinProximaAccion) bucket.casosSinProximaAccion += 1;
    if (sinProximaFecha) bucket.casosSinProximaFecha += 1;
    if (continuidadRota) bucket.casosConContinuidadRota += 1;
    if (caso.riesgo === "alto") bucket.casosConRiesgoAlto += 1;
    if (movimientoReciente) bucket.casosConMovimientoReciente += 1;
  }

  for (const area of Object.keys(porMacroarea) as MacroareaCaso[]) {
    const bucket = porMacroarea[area];
    const delegacion = calcularSenalDelegacion({
      casosActivos: bucket.casosActivos,
      casosVencidos: bucket.casosVencidos,
      casosBloqueados: bucket.casosBloqueados,
      casosConContinuidadRota: bucket.casosConContinuidadRota,
      casosConRiesgoAlto: bucket.casosConRiesgoAlto,
      casosSinProximaAccion: bucket.casosSinProximaAccion,
      casosSinProximaFecha: bucket.casosSinProximaFecha,
    });
    bucket.senalDelegacion = delegacion.nivel;
    bucket.senalDelegacionMotivo = delegacion.motivo;
  }

  const resumen = (Object.values(porMacroarea) as SenalesMacroarea[]).sort(
    (a, b) => a.macroarea_orden - b.macroarea_orden
  );

  return {
    resumen,
    porMacroarea,
    totalCasos: casos.length,
    totalActivos: resumen.reduce((acc, item) => acc + item.casosActivos, 0),
  };
}
