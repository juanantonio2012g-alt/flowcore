import type { CasoNormalizado } from "@/core/domain/casos";
import type { PostventaCommand, PostventaValidation } from "./contracts";

const ESTADOS_POSTVENTA_VALIDOS = new Set([
  "abierta",
  "en_seguimiento",
  "requiere_accion",
  "resuelta",
  "cerrada",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: PostventaCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    payload.fecha_postventa ||
      (payload.estado_postventa ?? "").trim() ||
      (payload.observacion_postventa ?? "").trim() ||
      typeof payload.requiere_accion === "boolean" ||
      (payload.proxima_accion ?? "").trim() ||
      payload.proxima_fecha ||
      typeof payload.conformidad_final === "boolean" ||
      (payload.responsable_postventa ?? "").trim() ||
      (payload.notas ?? "").trim()
  );
}

export function validatePostventaCommand(args: {
  command: PostventaCommand;
  caso: CasoNormalizado | null;
  postventaExiste: boolean;
}): PostventaValidation {
  const { command, caso, postventaExiste } = args;
  const errores: PostventaValidation["errores"] = [];
  const advertencias: PostventaValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_postventa",
    "actualizar_postventa",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para postventa.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar postventa.",
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
      mensaje: "Debes completar al menos un dato relevante de postventa.",
    });
  }

  const estado = (command.payload?.estado_postventa ?? "").trim();
  if (estado && !ESTADOS_POSTVENTA_VALIDOS.has(estado)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_postventa_invalido",
      mensaje: "El estado de postventa no es válido.",
    });
  }

  const fechaPostventa = command.payload?.fecha_postventa ?? null;
  if (fechaPostventa && !esFechaIsoDia(fechaPostventa)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_postventa_invalida",
      mensaje: "La fecha de postventa debe usar formato YYYY-MM-DD.",
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

  if (command.accion === "actualizar_postventa" && !command.postventa_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "postventa_id_obligatorio",
      mensaje: "Para actualizar postventa debes indicar postventa_id.",
    });
  }

  if (command.accion === "actualizar_postventa" && command.postventa_id && !postventaExiste) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "postventa_no_encontrada",
      mensaje: "No se encontró el registro de postventa a actualizar.",
    });
  }

  if (
    caso &&
    !postventaExiste &&
    caso.workflow.auditoria?.estado_auditoria !== "conforme"
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "postventa_requiere_auditoria_conforme",
      mensaje:
        "La postventa solo puede abrirse después de una auditoría conforme o sobre una postventa ya existente.",
    });
  }

  if (
    (estado === "resuelta" || estado === "cerrada") &&
    command.payload?.conformidad_final !== true
  ) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "conformidad_final_recomendada",
      mensaje:
        "Si la postventa se marca como resuelta o cerrada conviene confirmar conformidad_final.",
    });
  }

  if (
    command.payload?.requiere_accion === true &&
    !(command.payload?.proxima_accion ?? "").trim()
  ) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "proxima_accion_recomendada",
      mensaje:
        "Cuando postventa requiere acción conviene registrar la próxima acción explícita.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
