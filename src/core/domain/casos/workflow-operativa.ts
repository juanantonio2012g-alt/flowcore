import { derivarRiesgoCaso } from "@/lib/domain/casos/riesgo";
import { clasificarAccionProcesoActual } from "@/lib/domain/casos/proceso-actual";
import { parseFechaIsoLocal } from "@/lib/fecha";
import type { WorkflowDelCaso } from "./workflow";

export type SlaWorkflow = {
  nivel: "rojo" | "amarillo" | "verde";
  diasRestantes: number;
  slaDias: number;
  etiqueta: string;
  descripcion: string;
  fuente: "workflow" | "fallback";
};

export type RecomendacionWorkflow = {
  accion: string;
  urgencia: "alta" | "media" | "baja";
  motivo: string;
  fechaSugerida: string | null;
  fuente: "workflow" | "fallback";
};

type PrioridadCaso = "urgente" | "alta" | "media" | "baja" | null;

type CalcularSlaDesdeWorkflowArgs = {
  workflow: WorkflowDelCaso;
  prioridad: PrioridadCaso;
  createdAt?: string | null;
};

type RecomendarDesdeWorkflowArgs = {
  workflow: WorkflowDelCaso;
  prioridad: PrioridadCaso;
  estadoComercialReal: string;
  validacionPendiente: boolean;
};

function inicioDelDiaLocal(fecha: Date) {
  const copia = new Date(fecha);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

function sumarDias(fecha: Date, dias: number) {
  const copia = new Date(fecha);
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function hoyIso() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sumarDiasIso(dias: number) {
  const fecha = sumarDias(new Date(), dias);
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim().toLowerCase();
}

function parseDateSafe(valor: string | null | undefined) {
  return parseFechaIsoLocal(valor);
}

function ajustarSlaPorPrioridad(slaBaseDias: number, prioridad: PrioridadCaso) {
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

function slaBasePorWorkflow(workflow: WorkflowDelCaso) {
  if (workflow.alineacion.continuidad_vs_workflow === "vencida") return 0;

  switch (workflow.continuidad.estado) {
    case "bloqueada":
      return 1;
    case "pendiente":
      return 1;
    case "en_espera":
      return 3;
    case "vencida":
      return 0;
    case "cerrada":
      return 0;
    case "al_dia":
      break;
  }

  switch (workflow.etapa_actual) {
    case "solicitud":
    case "recoleccion":
      return 1;
    case "levantamiento":
      return 1;
    case "informe":
      return 2;
    case "diagnostico":
      return workflow.hitos.some(
        (hito) => hito.codigo === "diagnostico_observado" && hito.ocurrio
      ) || workflow.hitos.some(
        (hito) => hito.codigo === "diagnostico_rechazado" && hito.ocurrio
      )
        ? 1
        : 2;
    case "cotizacion":
      return 2;
    case "gestion_comercial":
      return workflow.hitos.some(
        (hito) => hito.codigo === "seguimiento_registrado" && hito.ocurrio
      )
        ? 2
        : 1;
    case "logistica_entrega":
      return 1;
    case "auditoria":
      return 2;
    case "postventa":
      return 3;
    case "cierre_tecnico":
      return 0;
    case "cerrado":
      return 4;
  }
}

function resolverFechaObjetivoDesdeWorkflow(args: CalcularSlaDesdeWorkflowArgs) {
  const { workflow, createdAt } = args;

  if (workflow.continuidad.estado === "cerrada") {
    return inicioDelDiaLocal(new Date());
  }

  if (workflow.continuidad.proxima_fecha) {
    const fecha = parseDateSafe(workflow.continuidad.proxima_fecha);
    if (fecha) return fecha;
  }

  const base =
    parseDateSafe(workflow.metadata.ultima_transicion_at) ??
    parseDateSafe(workflow.metadata.updated_at) ??
    parseDateSafe(createdAt) ??
    new Date();

  const dias = ajustarSlaPorPrioridad(slaBasePorWorkflow(workflow), args.prioridad);
  return sumarDias(inicioDelDiaLocal(base), dias);
}

export function calcularEstadoSlaDesdeWorkflow(
  args: CalcularSlaDesdeWorkflowArgs
): SlaWorkflow {
  if (args.workflow.continuidad.estado === "cerrada") {
    return {
      nivel: "verde",
      diasRestantes: 0,
      slaDias: 0,
      etiqueta: "Caso técnicamente cerrado",
      descripcion:
        "El caso completó auditoría y postventa y ya no mantiene continuidad operativa activa.",
      fuente: "workflow",
    };
  }

  const hoy = inicioDelDiaLocal(new Date());
  const objetivo = inicioDelDiaLocal(resolverFechaObjetivoDesdeWorkflow(args));
  const diffMs = objetivo.getTime() - hoy.getTime();
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const slaDias = ajustarSlaPorPrioridad(
    slaBasePorWorkflow(args.workflow),
    args.prioridad
  );

  if (args.workflow.alineacion.sla_vs_workflow === "inconsistente") {
    return {
      nivel: diasRestantes < 0 ? "rojo" : "amarillo",
      diasRestantes,
      slaDias,
      etiqueta: diasRestantes < 0 ? "SLA vencido" : "SLA con alineación pendiente",
      descripcion:
        "El SLA se está leyendo desde continuidad/workflow y detecta incoherencias con la continuidad operativa actual.",
      fuente: "workflow",
    };
  }

  if (args.workflow.continuidad.estado === "bloqueada") {
    return {
      nivel: "amarillo",
      diasRestantes,
      slaDias,
      etiqueta: "SLA bloqueado",
      descripcion:
        "La continuidad del caso quedó bloqueada y requiere redefinición antes de recuperar ritmo normal.",
      fuente: "workflow",
    };
  }

  if (diasRestantes < 0) {
    return {
      nivel: "rojo",
      diasRestantes,
      slaDias,
      etiqueta: "SLA vencido",
      descripcion:
        "La continuidad operativa real quedó fuera del tiempo esperado para la etapa actual del workflow.",
      fuente: "workflow",
    };
  }

  if (diasRestantes <= 1 || args.workflow.continuidad.estado === "pendiente") {
    return {
      nivel: "amarillo",
      diasRestantes,
      slaDias,
      etiqueta: "SLA próximo a vencer",
      descripcion:
        args.workflow.continuidad.estado === "pendiente"
          ? "La continuidad del caso sigue por definir para la etapa actual y necesita definición pronta."
          : "La continuidad actual debe atenderse pronto para no desfasar el workflow.",
      fuente: "workflow",
    };
  }

  return {
    nivel: "verde",
    diasRestantes,
    slaDias,
    etiqueta:
      args.workflow.continuidad.estado === "en_espera"
        ? "SLA en espera controlada"
        : "SLA en tiempo",
    descripcion:
      args.workflow.continuidad.estado === "en_espera"
        ? "El caso quedó en espera controlada y la próxima revisión sigue dentro del tiempo esperado."
        : "La continuidad operativa sigue alineada con la etapa actual del workflow.",
    fuente: "workflow",
  };
}

function nivelUrgenciaBase(args: {
  prioridad: PrioridadCaso;
  workflow: WorkflowDelCaso;
}) {
  if (
    args.workflow.continuidad.estado === "cerrada"
  ) {
    return "baja" as const;
  }

  if (
    args.workflow.continuidad.estado === "vencida" ||
    args.workflow.alineacion.continuidad_vs_workflow === "desfasada" ||
    args.workflow.alineacion.expediente_vs_workflow !== "alineado"
  ) {
    return "alta" as const;
  }

  if (
    args.prioridad === "urgente" ||
    args.prioridad === "alta" ||
    args.workflow.continuidad.estado === "pendiente"
  ) {
    return "media" as const;
  }

  if (args.workflow.continuidad.estado === "en_espera") {
    return "baja" as const;
  }

  return "media" as const;
}

function resolverFechaSugerida(
  urgencia: "alta" | "media" | "baja",
  workflow: WorkflowDelCaso
) {
  if (workflow.continuidad.estado === "cerrada") {
    return null;
  }

  if (
    workflow.continuidad.proxima_fecha &&
    workflow.continuidad.estado !== "pendiente" &&
    workflow.continuidad.estado !== "bloqueada"
  ) {
    return workflow.continuidad.proxima_fecha;
  }

  if (urgencia === "alta") return hoyIso();
  if (urgencia === "media") return sumarDiasIso(1);
  return sumarDiasIso(3);
}

function tieneHito(workflow: WorkflowDelCaso, codigo: string) {
  return workflow.hitos.some((hito) => hito.codigo === codigo && hito.ocurrio);
}

function pareceEsperaCliente(workflow: WorkflowDelCaso, estadoComercialReal: string) {
  const accion = normalizarTexto(workflow.continuidad.proxima_accion);
  const estadoComercial = normalizarTexto(estadoComercialReal);

  return (
    workflow.continuidad.estado === "en_espera" ||
    estadoComercial === "esperando_cliente" ||
    accion.includes("esperar respuesta") ||
    accion.includes("respuesta del cliente")
  );
}

function tieneRutaInicialValidaDesdeSolicitud(workflow: WorkflowDelCaso) {
  if (workflow.etapa_actual !== "solicitud" || !workflow.continuidad.proxima_accion) {
    return false;
  }

  if (
    normalizarTexto(workflow.continuidad.proxima_accion) ===
    "definir proxima accion y fecha"
  ) {
    return true;
  }

  const etapaAccion = clasificarAccionProcesoActual(
    workflow.continuidad.proxima_accion
  );

  return ["diagnostico", "gestion_comercial", "logistica_entrega"].includes(
    etapaAccion ?? ""
  ) || etapaAccion === "postventa";
}

export function recomendarAccionDesdeWorkflow(
  args: RecomendarDesdeWorkflowArgs
): RecomendacionWorkflow {
  const { workflow } = args;
  const urgenciaBase = nivelUrgenciaBase({
    prioridad: args.prioridad,
    workflow,
  });

  if (args.validacionPendiente) {
    if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_observado" && hito.ocurrio)) {
      return {
        accion: "Revisar observaciones del diagnóstico",
        urgencia: "alta",
        motivo:
          "La validación técnica dejó observaciones activas y el caso no debería avanzar hasta corregirlas.",
        fechaSugerida: hoyIso(),
        fuente: "workflow",
      };
    }

    if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_rechazado" && hito.ocurrio)) {
      return {
        accion: "Reformular diagnóstico",
        urgencia: "alta",
        motivo:
          "La validación técnica rechazó el criterio actual y el expediente necesita un nuevo diagnóstico confirmado.",
        fechaSugerida: hoyIso(),
        fuente: "workflow",
      };
    }

    if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_validado" && hito.ocurrio)) {
      return {
        accion: "Preparar cotización",
        urgencia: urgenciaBase,
        motivo:
          "El diagnóstico ya quedó validado y el siguiente paso estructural es convertirlo en propuesta comercial.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    }

    return {
      accion: "Validar diagnóstico humano",
      urgencia: "alta",
      motivo:
        "El workflow marca validación técnica pendiente y conviene resolverla antes de mover el caso aguas abajo.",
      fechaSugerida: hoyIso(),
      fuente: "workflow",
    };
  }

  if (workflow.alineacion.expediente_vs_workflow === "atrasado" && !tieneHito(workflow, "cotizacion_emitida")) {
    return {
      accion: "Preparar cotización",
      urgencia: "alta",
      motivo:
        "La continuidad ya empuja gestión comercial, pero el expediente todavía no tiene cotización formal registrada.",
      fechaSugerida: hoyIso(),
      fuente: "workflow",
    };
  }

  if (workflow.alineacion.continuidad_vs_workflow === "desfasada") {
    if (tieneRutaInicialValidaDesdeSolicitud(workflow)) {
      return {
        accion: workflow.continuidad.proxima_accion ?? "Definir próxima acción y fecha",
        urgencia: urgenciaBase,
        motivo:
          "Desde solicitud, la continuidad actual ya define una ruta válida de arranque para el caso, aunque todavía falte completar su formalización operativa.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    }

    if (
      workflow.etapa_actual === "diagnostico" &&
      tieneHito(workflow, "diagnostico_validado") &&
      !tieneHito(workflow, "cotizacion_emitida") &&
      !args.validacionPendiente
    ) {
      return {
        accion: "Preparar cotización",
        urgencia: "alta",
        motivo:
          "El diagnóstico ya quedó validado y la continuidad todavía no refleja el siguiente paso estructural de cotización.",
        fechaSugerida: hoyIso(),
        fuente: "workflow",
      };
    }

    if (workflow.etapa_actual === "cotizacion" || workflow.etapa_actual === "gestion_comercial") {
      return {
        accion: "Reordenar continuidad comercial",
        urgencia: "alta",
        motivo:
          "La continuidad operativa quedó desalineada respecto a la etapa estructural actual del caso.",
        fechaSugerida: hoyIso(),
        fuente: "workflow",
      };
    }

    if (workflow.etapa_actual === "auditoria") {
      return {
        accion: "Registrar resultado de auditoría",
        urgencia: urgenciaBase,
        motivo:
          "El caso ha avanzado a la etapa de auditoría tras confirmación de entrega. Registre el resultado de la auditoría para continuar.",
        fechaSugerida: hoyIso(),
        fuente: "workflow",
      };
    }

    return {
      accion: "Reordenar continuidad operativa",
      urgencia: "alta",
      motivo:
        "El workflow detecta que la próxima acción vigente no corresponde con la etapa actual del expediente.",
      fechaSugerida: hoyIso(),
      fuente: "workflow",
    };
  }

  switch (workflow.etapa_actual) {
    case "solicitud":
      if (tieneRutaInicialValidaDesdeSolicitud(workflow)) {
        return {
          accion: workflow.continuidad.proxima_accion ?? "Definir próxima acción y fecha",
          urgencia: urgenciaBase,
          motivo:
            "La continuidad actual ya abre una ruta válida desde solicitud y conviene consolidarla antes de pedir una redefinición genérica.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      return {
        accion: "Definir próxima acción y fecha",
        urgencia: urgenciaBase,
        motivo:
          "El caso todavía está en fase inicial y necesita continuidad mínima clara para avanzar con orden.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "recoleccion":
      return {
        accion: "Definir próxima acción y fecha",
        urgencia: urgenciaBase,
        motivo:
          "El caso todavía está en fase inicial y necesita continuidad mínima clara para avanzar con orden.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "levantamiento":
      return {
        accion: "Programar levantamiento",
        urgencia: urgenciaBase,
        motivo:
          "La siguiente frontera estructural es capturar el levantamiento o visita técnica requerida.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "informe":
      return {
        accion: "Registrar informe técnico",
        urgencia: urgenciaBase,
        motivo:
          "El workflow sigue dependiendo de contar con un informe técnico estructuralmente disponible.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "diagnostico":
      if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_observado" && hito.ocurrio)) {
        return {
          accion: "Revisar observaciones del diagnóstico",
          urgencia: "alta",
          motivo:
            "La validación técnica dejó observaciones activas y el caso no debería avanzar hasta corregirlas.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_rechazado" && hito.ocurrio)) {
        return {
          accion: "Reformular diagnóstico",
          urgencia: "alta",
          motivo:
            "La validación técnica rechazó el criterio actual y el expediente necesita un nuevo diagnóstico confirmado.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      if (workflow.hitos.some((hito) => hito.codigo === "diagnostico_validado" && hito.ocurrio)) {
        return {
          accion: "Preparar cotización",
          urgencia: urgenciaBase,
          motivo:
            "El diagnóstico ya quedó validado y el siguiente paso estructural es convertirlo en propuesta comercial.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      if (tieneHito(workflow, "diagnostico_registrado") && !args.validacionPendiente) {
        return {
          accion: "Preparar cotización",
          urgencia: urgenciaBase,
          motivo:
            "El diagnóstico ya quedó registrado con consistencia suficiente y el siguiente paso estructural es convertirlo en propuesta comercial.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      if (args.validacionPendiente) {
        return {
          accion: "Validar diagnóstico humano",
          urgencia: "alta",
          motivo:
            "El workflow marca validación técnica pendiente y conviene resolverla antes de mover el caso aguas abajo.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      return {
        accion: "Realizar diagnóstico",
        urgencia: urgenciaBase,
        motivo:
          "El caso ya tiene base inicial, pero todavía necesita cerrar el diagnóstico estructural.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "cotizacion":
      if (!tieneHito(workflow, "cotizacion_emitida")) {
        return {
          accion: "Preparar cotización",
          urgencia: urgenciaBase,
          motivo:
            "La etapa actual del workflow es cotización y todavía falta emitir una propuesta formal.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      if (pareceEsperaCliente(workflow, args.estadoComercialReal)) {
        return {
          accion: "Esperar respuesta del cliente",
          urgencia: args.prioridad === "urgente" ? "media" : "baja",
          motivo:
            "La cotización ya fue emitida y la continuidad actual indica que el caso quedó del lado del cliente.",
          fechaSugerida: resolverFechaSugerida(
            args.prioridad === "urgente" ? "media" : "baja",
            workflow
          ),
          fuente: "workflow",
        };
      }

      return {
        accion: "Dar seguimiento comercial",
        urgencia: urgenciaBase,
        motivo:
          "La cotización ya fue emitida y el caso necesita el primer empuje comercial para mover definición del cliente.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "gestion_comercial":
      if (!tieneHito(workflow, "seguimiento_registrado")) {
        return {
          accion: "Dar seguimiento comercial",
          urgencia: urgenciaBase,
          motivo:
            "Existe movimiento comercial abierto, pero todavía no se registra seguimiento visible dentro del expediente.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      if (workflow.continuidad.estado === "vencida") {
        return {
          accion: "Reprogramar seguimiento",
          urgencia: "alta",
          motivo:
            "Ya hubo seguimiento comercial, pero la continuidad quedó vencida y necesita una nueva fecha de control.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      if (pareceEsperaCliente(workflow, args.estadoComercialReal)) {
        return {
          accion: "Esperar respuesta del cliente",
          urgencia: args.prioridad === "urgente" ? "media" : "baja",
          motivo:
            "El caso ya tuvo gestión comercial y quedó del lado del cliente, por lo que conviene controlar la espera sin duplicar seguimiento.",
          fechaSugerida: resolverFechaSugerida(
            args.prioridad === "urgente" ? "media" : "baja",
            workflow
          ),
          fuente: "workflow",
        };
      }

      return {
        accion: "Continuar gestión comercial",
        urgencia:
          workflow.continuidad.estado === "pendiente" ? "alta" : urgenciaBase,
        motivo:
          "El caso ya registra seguimiento comercial y necesita continuidad sobre una gestión existente, no reiniciar el seguimiento.",
        fechaSugerida: resolverFechaSugerida(
          workflow.continuidad.estado === "pendiente" ? "alta" : urgenciaBase,
          workflow
        ),
        fuente: "workflow",
      };
    case "logistica_entrega":
      if (workflow.logistica?.estado_logistico === "incidencia") {
        return {
          accion: "Resolver incidencia logística",
          urgencia: "alta",
          motivo:
            "La etapa logística registró una incidencia y necesita resolución antes de continuar con la entrega.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      if (
        workflow.logistica?.estado_logistico === "entregado" ||
        tieneHito(workflow, "entrega_realizada")
      ) {
        return {
          accion: "Confirmar entrega realizada",
          urgencia: workflow.continuidad.estado === "pendiente" ? "alta" : "media",
          motivo:
            "La logística ya marca la entrega como realizada y conviene asegurar confirmación operativa y documental.",
          fechaSugerida: resolverFechaSugerida(
            workflow.continuidad.estado === "pendiente" ? "alta" : "media",
            workflow
          ),
          fuente: "workflow",
        };
      }

      if (
        workflow.logistica?.estado_logistico === "en_ejecucion" ||
        tieneHito(workflow, "entrega_en_ejecucion")
      ) {
        return {
          accion: "Ejecutar entrega",
          urgencia: urgenciaBase === "baja" ? "media" : urgenciaBase,
          motivo:
            "La logística ya está en curso y la prioridad operativa pasa por sostener la ejecución hasta su confirmación.",
          fechaSugerida: resolverFechaSugerida(
            urgenciaBase === "baja" ? "media" : urgenciaBase,
            workflow
          ),
          fuente: "workflow",
        };
      }

      if (
        workflow.logistica?.estado_logistico === "programado" ||
        tieneHito(workflow, "entrega_programada")
      ) {
        return {
          accion: "Ejecutar entrega",
          urgencia: urgenciaBase,
          motivo:
            "La programación logística ya existe y el siguiente paso operativo es convertirla en ejecución real.",
          fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
          fuente: "workflow",
        };
      }

      return {
        accion: "Confirmar programación",
        urgencia: urgenciaBase,
        motivo:
          "El caso ya salió de gestión comercial y necesita abrir su tramo logístico con una programación explícita.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "auditoria":
      if (workflow.auditoria?.estado_auditoria === "requiere_correccion") {
        return {
          accion: "Gestionar corrección pendiente",
          urgencia: "alta",
          motivo:
            "La auditoría identificó correcciones necesarias y el caso necesita resolverlas antes del cierre técnico.",
          fechaSugerida: hoyIso(),
          fuente: "workflow",
        };
      }

      if (workflow.auditoria?.estado_auditoria === "conforme") {
        return {
          accion: "Registrar seguimiento postventa",
          urgencia: "media",
          motivo:
            "La auditoría confirmó conformidad y el siguiente paso estructural es abrir postventa antes del cierre técnico.",
          fechaSugerida: resolverFechaSugerida("media", workflow),
          fuente: "workflow",
        };
      }

      return {
        accion: "Registrar resultado de auditoría",
        urgencia: urgenciaBase,
        motivo:
          "La etapa actual requiere revisar conformidad, cierre técnico o cierre administrativo antes de pasar a postventa.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "postventa":
      if (
        workflow.postventa?.estado_postventa &&
        ["resuelta", "cerrada"].includes(workflow.postventa.estado_postventa) &&
        workflow.postventa.conformidad_final === true &&
        workflow.postventa.requiere_accion !== true
      ) {
        return {
          accion: "Cerrar técnicamente el caso",
          urgencia: "media",
          motivo:
            "La postventa ya quedó resuelta con conformidad final y sin remanentes operativos.",
          fechaSugerida: resolverFechaSugerida("media", workflow),
          fuente: "workflow",
        };
      }

      if (workflow.postventa?.requiere_accion) {
        return {
          accion:
            workflow.postventa.proxima_accion ??
            "Gestionar acción postventa pendiente",
          urgencia: "alta",
          motivo:
            "La postventa mantiene un pendiente real que debe resolverse antes de habilitar el cierre técnico.",
          fechaSugerida: resolverFechaSugerida("alta", workflow),
          fuente: "workflow",
        };
      }

      return {
        accion:
          workflow.postventa?.proxima_accion ?? "Dar seguimiento postventa",
        urgencia: urgenciaBase,
        motivo:
          "El caso entró a una etapa de postventa y necesita continuidad acorde a esa relación posterior al cierre principal.",
        fechaSugerida: resolverFechaSugerida(urgenciaBase, workflow),
        fuente: "workflow",
      };
    case "cierre_tecnico":
      return {
        accion: "Caso técnicamente cerrado",
        urgencia: "baja",
        motivo:
          "El caso completó auditoría y postventa y ya no tiene acciones operativas pendientes.",
        fechaSugerida: null,
        fuente: "workflow",
      };
    case "cerrado":
      return {
        accion:
          normalizarTexto(args.estadoComercialReal) === "rechazado"
            ? "Confirmar cierre del caso"
            : "Revisar cierre del caso",
        urgencia: "baja",
        motivo:
          "El workflow ya refleja un estado de cierre; sólo conviene asegurar consistencia documental y decisión final.",
        fechaSugerida: resolverFechaSugerida("baja", workflow),
        fuente: "workflow",
      };
  }
}

export function derivarRiesgoDesdeWorkflow(args: {
  workflow: WorkflowDelCaso;
  sla: Pick<SlaWorkflow, "nivel">;
  estadoComercialReal: string;
}) {
  if (
    args.workflow.alineacion.continuidad_vs_workflow === "desfasada" &&
    args.sla.nivel !== "rojo"
  ) {
    return "alto" as const;
  }

  return derivarRiesgoCaso({
    slaNivel: args.sla.nivel,
    estadoComercialReal: args.estadoComercialReal,
  });
}
