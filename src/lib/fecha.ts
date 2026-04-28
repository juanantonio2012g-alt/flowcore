const SOLO_FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseFechaIso(fechaIso: string | null | undefined) {
  if (!fechaIso) return null;

  if (SOLO_FECHA_REGEX.test(fechaIso)) {
    const [year, month, day] = fechaIso.split("-").map(Number);
    const fechaLocal = new Date(year, month - 1, day);
    return Number.isNaN(fechaLocal.getTime()) ? null : fechaLocal;
  }

  const fecha = new Date(fechaIso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function esFechaSoloDia(fechaIso: string | null | undefined) {
  return !!fechaIso && SOLO_FECHA_REGEX.test(fechaIso);
}

export function formatearFecha(fechaIso: string | null | undefined): string {
  const fecha = parseFechaIso(fechaIso);
  if (!fecha) return "-";

  const formato = esFechaSoloDia(fechaIso)
    ? {
        dateStyle: "medium" as const,
        timeZone: "America/Santo_Domingo",
      }
    : {
        dateStyle: "medium" as const,
        timeStyle: "short" as const,
        timeZone: "America/Santo_Domingo",
      };

  return new Intl.DateTimeFormat("es-DO", formato).format(fecha);
}

export function formatearFechaCorta(fechaIso: string | null | undefined): string {
  const fecha = parseFechaIso(fechaIso);
  if (!fecha) return "-";

  return new Intl.DateTimeFormat("es-DO", {
    dateStyle: "medium",
    timeZone: "America/Santo_Domingo",
  }).format(fecha);
}

export function parseFechaIsoLocal(fechaIso: string | null | undefined) {
  return parseFechaIso(fechaIso);
}
