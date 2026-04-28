export type PrioridadCaso = "urgente" | "alta" | "media" | "baja" | null;

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim().toLowerCase();
}

export function obtenerSlaBasePorAccion(proximaAccion: string | null | undefined) {
  const accion = normalizarTexto(proximaAccion);

  if (!accion) return 2;

  if (accion.includes("validar diagnóstico") || accion.includes("validar diagnostico")) {
    return 1;
  }

  if (accion.includes("programar visita")) {
    return 1;
  }

  if (accion.includes("enviar cotización") || accion.includes("enviar cotizacion")) {
    return 1;
  }

  if (accion.includes("registrar informe")) {
    return 2;
  }

  if (accion.includes("realizar diagnóstico") || accion.includes("realizar diagnostico")) {
    return 2;
  }

  if (accion.includes("preparar cotización") || accion.includes("preparar cotizacion")) {
    return 2;
  }

  if (accion.includes("dar seguimiento")) {
    return 2;
  }

  if (accion.includes("confirmar aprobación") || accion.includes("confirmar aprobacion")) {
    return 2;
  }

  if (accion.includes("esperar respuesta del cliente")) {
    return 3;
  }

  if (accion.includes("esperar aprobación interna") || accion.includes("esperar aprobacion interna")) {
    return 3;
  }

  if (accion.includes("esperar")) {
    return 3;
  }

  return 2;
}

export function ajustarSlaPorPrioridad(
  slaBaseDias: number,
  prioridad: PrioridadCaso
) {
  switch (prioridad) {
    case "urgente":
      return Math.max(1, slaBaseDias - 1);
    case "alta":
      return slaBaseDias;
    case "media":
      return slaBaseDias + 1;
    case "baja":
      return slaBaseDias + 2;
    default:
      return slaBaseDias;
  }
}

export function obtenerSlaDias(args: {
  prioridad: PrioridadCaso;
  proximaAccion?: string | null;
}) {
  const base = obtenerSlaBasePorAccion(args.proximaAccion);
  return ajustarSlaPorPrioridad(base, args.prioridad);
}

export function inicioDelDiaLocal(fecha: Date) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

export function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

export function resolverFechaObjetivo(args: {
  prioridad: PrioridadCaso;
  createdAt?: string | null;
  proximaFecha?: string | null;
  proximaAccion?: string | null;
}) {
  if (args.proximaFecha) {
    const fecha = new Date(args.proximaFecha);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }

  const base = args.createdAt ? new Date(args.createdAt) : new Date();
  const baseValida = Number.isNaN(base.getTime()) ? new Date() : base;
  const dias = obtenerSlaDias({
    prioridad: args.prioridad,
    proximaAccion: args.proximaAccion,
  });

  return sumarDias(inicioDelDiaLocal(baseValida), dias);
}

export function calcularEstadoSla(args: {
  prioridad: PrioridadCaso;
  createdAt?: string | null;
  proximaFecha?: string | null;
  proximaAccion?: string | null;
}) {
  const hoy = inicioDelDiaLocal(new Date());
  const objetivo = inicioDelDiaLocal(
    resolverFechaObjetivo({
      prioridad: args.prioridad,
      createdAt: args.createdAt,
      proximaFecha: args.proximaFecha,
      proximaAccion: args.proximaAccion,
    })
  );

  const diffMs = objetivo.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const slaDias = obtenerSlaDias({
    prioridad: args.prioridad,
    proximaAccion: args.proximaAccion,
  });

  if (diasRestantes < 0) {
    return {
      nivel: "rojo" as const,
      diasRestantes,
      slaDias,
      etiqueta: "SLA vencido",
      descripcion: "La próxima acción quedó fuera del tiempo esperado.",
    };
  }

  if (diasRestantes <= 1) {
    return {
      nivel: "amarillo" as const,
      diasRestantes,
      slaDias,
      etiqueta: "SLA próximo a vencer",
      descripcion: "La próxima acción debe ocurrir pronto para no incumplir.",
    };
  }

  return {
    nivel: "verde" as const,
    diasRestantes,
    slaDias,
    etiqueta: "SLA en tiempo",
    descripcion: "La próxima acción sigue dentro del tiempo esperado.",
  };
}