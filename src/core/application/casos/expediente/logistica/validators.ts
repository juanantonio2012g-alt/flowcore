import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  LogisticaCommand,
  LogisticaValidation,
} from "./contracts";
import {
  MENSAJE_CONTENIDO_MINIMO_LOGISTICA,
  tieneContenidoOperativoMinimoLogistica,
} from "./minimoOperativo";

const ESTADOS_LOGISTICOS_VALIDOS = new Set([
  "pendiente",
  "programado",
  "en_ejecucion",
  "entregado",
  "incidencia",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function esFechaIsoTimestamp(valor: string) {
  return !Number.isNaN(new Date(valor).getTime());
}

function hayPayloadUtil(command: LogisticaCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    payload.fecha_programada ||
      (payload.responsable ?? "").trim() ||
      (payload.estado_logistico ?? "").trim() ||
      (payload.observacion_logistica ?? "").trim() ||
      typeof payload.confirmacion_entrega === "boolean" ||
      payload.fecha_entrega ||
      (payload.proxima_accion ?? "").trim() ||
      payload.proxima_fecha
  );
}

export function validateLogisticaCommand(args: {
  command: LogisticaCommand;
  caso: CasoNormalizado | null;
  logisticaExiste: boolean;
}): LogisticaValidation {
  const { command, caso, logisticaExiste } = args;
  const errores: LogisticaValidation["errores"] = [];
  const advertencias: LogisticaValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_logistica",
    "actualizar_logistica",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para logística.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar logística.",
    });
  }

  if (!caso) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_encontrado",
      mensaje: "No se encontró el caso solicitado.",
    });
  }

  if (!hayPayloadUtil(command)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "payload_vacio",
      mensaje: "Debes completar al menos un dato relevante de logística.",
    });
  }

  const fechaProgramada = command.payload?.fecha_programada ?? null;
  if (fechaProgramada && !esFechaIsoDia(fechaProgramada)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_programada_invalida",
      mensaje: "La fecha programada debe usar formato YYYY-MM-DD.",
    });
  }

  const fechaEntrega = command.payload?.fecha_entrega ?? null;
  if (fechaEntrega && !esFechaIsoTimestamp(fechaEntrega)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_entrega_invalida",
      mensaje: "La fecha de entrega debe ser una fecha válida.",
    });
  }

  const proximaFecha = command.payload?.proxima_fecha ?? null;
  if (proximaFecha && !esFechaIsoDia(proximaFecha)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "proxima_fecha_invalida",
      mensaje: "La próxima fecha debe usar formato YYYY-MM-DD.",
    });
  }

  const estado = (command.payload?.estado_logistico ?? "").trim();
  if (estado && !ESTADOS_LOGISTICOS_VALIDOS.has(estado)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_logistico_invalido",
      mensaje: "El estado logístico no es válido.",
    });
  }

  if (command.accion === "actualizar_logistica" && !command.logistica_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "logistica_id_obligatorio",
      mensaje: "Para actualizar logística debes indicar logistica_id.",
    });
  }

  if (
    command.accion === "actualizar_logistica" &&
    command.logistica_id &&
    !logisticaExiste
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "logistica_no_encontrada",
      mensaje: "No se encontró el registro de logística a actualizar.",
    });
  }

  if (
    command.accion === "registrar_logistica" &&
    !tieneContenidoOperativoMinimoLogistica({
      fecha_programada: command.payload?.fecha_programada ?? null,
      responsable: command.payload?.responsable ?? null,
      observacion_logistica: command.payload?.observacion_logistica ?? null,
      confirmacion_entrega: command.payload?.confirmacion_entrega ?? null,
      fecha_entrega: command.payload?.fecha_entrega ?? null,
    })
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "contenido_operativo_minimo_requerido",
      mensaje: MENSAJE_CONTENIDO_MINIMO_LOGISTICA,
    });
  }

  if (
    command.payload?.confirmacion_entrega === true &&
    !(command.payload?.fecha_entrega ?? "").trim()
  ) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "entrega_sin_fecha",
      mensaje:
        "Conviene registrar la fecha de entrega cuando se confirma la entrega realizada.",
    });
  }

  if (!!(command.payload?.proxima_accion ?? "").trim() !== !!command.payload?.proxima_fecha) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "continuidad_incompleta",
      mensaje:
        "La logística quedó con continuidad incompleta. Conviene definir próxima acción y fecha en conjunto.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
