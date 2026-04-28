export function resolverRutaAccionSugerida(casoId: string, accion: string) {
  const normalizada = accion.toLowerCase();

  if (normalizada.includes("técnicamente cerrado") || normalizada.includes("tecnicamente cerrado")) {
    return {
      href: `/casos/${casoId}`,
      label: "Ver expediente completo",
    };
  }

  if (normalizada.includes("seguimiento")) {
    return {
      href: `/casos/${casoId}/seguimiento`,
      label: "Ir al módulo de seguimiento",
    };
  }

  if (normalizada.includes("diagnóstico") || normalizada.includes("diagnostico")) {
    return {
      href: `/casos/${casoId}/diagnostico`,
      label: "Ir al módulo de diagnóstico",
    };
  }

  if (normalizada.includes("cotización") || normalizada.includes("cotizacion")) {
    return {
      href: `/casos/${casoId}/cotizacion`,
      label: "Ir al módulo de cotización",
    };
  }

  if (
    normalizada.includes("logística") ||
    normalizada.includes("logistica") ||
    normalizada.includes("entrega") ||
    normalizada.includes("ejecución") ||
    normalizada.includes("ejecucion") ||
    normalizada.includes("programación") ||
    normalizada.includes("programacion")
  ) {
    return {
      href: `/casos/${casoId}/logistica`,
      label: "Ir al módulo de logística",
    };
  }

  if (
    normalizada.includes("cerrar técnicamente") ||
    normalizada.includes("cerrar tecnicamente") ||
    normalizada.includes("cierre técnico")
  ) {
    return {
      href: `/casos/${casoId}/cierre-tecnico`,
      label: "Ir al módulo de cierre técnico",
    };
  }

  if (
    normalizada.includes("postventa") ||
    normalizada.includes("garant") ||
    normalizada.includes("mantenimiento")
  ) {
    return {
      href: `/casos/${casoId}/postventa`,
      label: "Ir al módulo de postventa",
    };
  }

  if (normalizada.includes("informe")) {
    return {
      href: `/casos/${casoId}/informe`,
      label: "Ir al módulo de informe",
    };
  }

  return {
    href: `/casos/${casoId}`,
    label: "Ver expediente completo",
  };
}
