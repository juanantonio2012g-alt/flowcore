export type UrgenciaOperativa = "alta" | "media" | "baja";

export type RecomendacionOperativa = {
  accion: string;
  urgencia: UrgenciaOperativa;
  motivo: string;
  fechaSugerida: string | null;
};

type Args = {
  prioridad?: string | null;
  estadoComercial?: string | null;
  estadoTecnico?: string | null;
  proximaAccion?: string | null;
  proximaFecha?: string | null;
  riesgo?: "alto" | "medio" | "bajo";
  requiereValidacion?: boolean;
  tieneInforme?: boolean;
  tieneDiagnostico?: boolean;
  tieneCotizacion?: boolean;
  tieneSeguimiento?: boolean;
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim().toLowerCase();
}

function pareceEsperaCliente(
  estadoComercial: string,
  proximaAccion: string | null | undefined
) {
  const accion = normalizarTexto(proximaAccion);

  return (
    estadoComercial === "esperando_cliente" ||
    accion.includes("esperar respuesta") ||
    accion.includes("respuesta del cliente") ||
    accion.includes("esperando cliente")
  );
}

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function sumarDiasIso(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

export function recomendarAccionOperativa(args: Args): RecomendacionOperativa {
  const estadoComercial = normalizarTexto(args.estadoComercial);
  const riesgo = args.riesgo ?? "bajo";
  const sinAccion = !args.proximaAccion;
  const sinFecha = !args.proximaFecha;

  if (args.requiereValidacion) {
    return {
      accion: "Validar diagnóstico humano",
      urgencia: "alta",
      motivo: "El caso tiene validación pendiente y requiere cierre técnico antes de avanzar.",
      fechaSugerida: hoyIso(),
    };
  }

  if (riesgo === "alto" && (sinAccion || sinFecha)) {
    return {
      accion: "Definir próxima acción y fecha",
      urgencia: "alta",
      motivo: "El caso está en riesgo alto y tiene vacíos operativos que impiden continuidad clara.",
      fechaSugerida: hoyIso(),
    };
  }

  if (!args.tieneInforme) {
    return {
      accion: "Registrar informe técnico",
      urgencia: args.prioridad === "urgente" || args.prioridad === "alta" ? "alta" : "media",
      motivo: "Todavía no existe informe técnico y el caso necesita base documental.",
      fechaSugerida: args.prioridad === "urgente" ? hoyIso() : sumarDiasIso(1),
    };
  }

  if (!args.tieneDiagnostico) {
    return {
      accion: "Realizar diagnóstico",
      urgencia: riesgo === "alto" ? "alta" : "media",
      motivo: "El caso tiene información inicial, pero aún no cuenta con diagnóstico estructurado.",
      fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(1),
    };
  }

  if (!args.tieneCotizacion && (estadoComercial === "sin_cotizar" || estadoComercial === "")) {
    return {
      accion: "Preparar cotización",
      urgencia: riesgo === "alto" ? "alta" : "media",
      motivo: "El caso ya tiene base técnica suficiente y conviene moverlo a propuesta comercial.",
      fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(2),
    };
  }

  if (
    args.tieneCotizacion &&
    (estadoComercial === "cotizado" || estadoComercial === "negociacion" || estadoComercial === "en_proceso")
  ) {
    if (!args.tieneSeguimiento) {
      return {
        accion: "Dar seguimiento comercial",
        urgencia: riesgo === "alto" ? "alta" : "media",
        motivo: "Existe movimiento comercial abierto y todavía no hay seguimiento visible para impulsar definición del cliente.",
        fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(1),
      };
    }

    if (sinAccion && sinFecha) {
      return {
        accion: "Reprogramar seguimiento",
        urgencia: riesgo === "alto" ? "alta" : "media",
        motivo: "Ya hubo seguimiento comercial, pero falta definir el próximo contacto o control.",
        fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(1),
      };
    }

    if (pareceEsperaCliente(estadoComercial, args.proximaAccion)) {
      return {
        accion: "Esperar respuesta del cliente",
        urgencia: riesgo === "alto" ? "media" : "baja",
        motivo: "El seguimiento comercial ya ocurrió y el caso quedó pendiente de respuesta del cliente.",
        fechaSugerida: args.proximaFecha || sumarDiasIso(2),
      };
    }

    return {
      accion: "Continuar gestión comercial",
      urgencia: riesgo === "alto" ? "alta" : "media",
      motivo: "El caso ya registra seguimiento comercial y requiere continuidad para avanzar hacia definición.",
      fechaSugerida: args.proximaFecha || (riesgo === "alto" ? hoyIso() : sumarDiasIso(1)),
    };
  }

  if (!args.tieneSeguimiento) {
    return {
      accion: "Registrar seguimiento",
      urgencia: "media",
      motivo: "El caso no tiene seguimiento reciente y necesita continuidad operativa visible.",
      fechaSugerida: sumarDiasIso(1),
    };
  }

  if (sinAccion) {
    return {
      accion: "Definir siguiente paso",
      urgencia: riesgo === "alto" ? "alta" : "media",
      motivo: "El caso carece de una próxima acción explícita.",
      fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(1),
    };
  }

  if (sinFecha) {
    return {
      accion: "Programar próxima fecha",
      urgencia: riesgo === "alto" ? "alta" : "media",
      motivo: "El caso tiene acción definida, pero no fecha de control o ejecución.",
      fechaSugerida: riesgo === "alto" ? hoyIso() : sumarDiasIso(1),
    };
  }

  if (estadoComercial === "aprobado") {
    return {
      accion: "Coordinar ejecución o cierre",
      urgencia: "media",
      motivo: "El caso ya fue aprobado y debe traducirse en ejecución o cierre formal.",
      fechaSugerida: sumarDiasIso(1),
    };
  }

  if (estadoComercial === "rechazado" || estadoComercial === "pausado") {
    return {
      accion: "Revisar estrategia del caso",
      urgencia: "baja",
      motivo: "El caso fue pausado o rechazado y requiere decisión sobre cierre, espera o replanteamiento.",
      fechaSugerida: sumarDiasIso(3),
    };
  }

  return {
    accion: args.proximaAccion || "Mantener seguimiento estructurado",
    urgencia: riesgo === "alto" ? "alta" : riesgo === "medio" ? "media" : "baja",
    motivo: "El caso tiene continuidad activa; conviene sostener seguimiento ordenado.",
    fechaSugerida: args.proximaFecha || sumarDiasIso(2),
  };
}
