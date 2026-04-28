import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  CotizacionCommand,
  CotizacionValidation,
} from "./contracts";

const ESTADOS_COTIZACION_VALIDOS = new Set([
  "pendiente",
  "enviada",
  "ajustada",
  "aprobada",
  "rechazada",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: CotizacionCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    payload.fecha_cotizacion ||
      (payload.solucion_asociada ?? "").trim() ||
      (payload.productos_incluidos ?? "").trim() ||
      (payload.cantidades ?? "").trim() ||
      (payload.condiciones ?? "").trim() ||
      (payload.observaciones ?? "").trim() ||
      typeof payload.monto === "number" ||
      (payload.estado ?? "").trim() ||
      (payload.proxima_accion ?? "").trim() ||
      payload.proxima_fecha
  );
}

export function validateCotizacionCommand(args: {
  command: CotizacionCommand;
  caso: CasoNormalizado | null;
  cotizacionExiste: boolean;
}): CotizacionValidation {
  const { command, caso, cotizacionExiste } = args;
  const errores: CotizacionValidation["errores"] = [];
  const advertencias: CotizacionValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_cotizacion",
    "actualizar_cotizacion",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para cotización.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar cotización.",
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
      mensaje: "Debes completar al menos un dato relevante de la cotización.",
    });
  }

  if (command.accion === "registrar_cotizacion") {
    if (!command.payload?.fecha_cotizacion) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "fecha_cotizacion_obligatoria",
        mensaje: "La fecha de cotización es obligatoria.",
      });
    }

    if (command.payload?.monto === null || typeof command.payload?.monto !== "number") {
      errores.push({
        caso_id: command.caso_id,
        codigo: "monto_obligatorio",
        mensaje: "El monto es obligatorio para registrar cotización.",
      });
    }

    if (!(command.payload?.estado ?? "").trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "estado_obligatorio",
        mensaje: "El estado de la cotización es obligatorio.",
      });
    }
  }

  const fechaCotizacion = command.payload?.fecha_cotizacion ?? null;
  if (fechaCotizacion && !esFechaIsoDia(fechaCotizacion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_cotizacion_invalida",
      mensaje: "La fecha de cotización debe usar formato YYYY-MM-DD.",
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

  const estado = (command.payload?.estado ?? "").trim();
  if (estado && !ESTADOS_COTIZACION_VALIDOS.has(estado)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_cotizacion_invalido",
      mensaje: "El estado de la cotización no es válido.",
    });
  }

  const monto = command.payload?.monto;
  if (typeof monto === "number" && (!Number.isFinite(monto) || monto < 0)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "monto_invalido",
      mensaje: "El monto debe ser un número válido mayor o igual a cero.",
    });
  }

  if (command.accion === "actualizar_cotizacion" && !command.cotizacion_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "cotizacion_id_obligatorio",
      mensaje: "Para actualizar cotización debes indicar cotizacion_id.",
    });
  }

  if (
    command.accion === "actualizar_cotizacion" &&
    command.cotizacion_id &&
    !cotizacionExiste
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "cotizacion_no_encontrada",
      mensaje: "No se encontró la cotización a actualizar.",
    });
  }

  if (!!(command.payload?.proxima_accion ?? "").trim() !== !!command.payload?.proxima_fecha) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "continuidad_incompleta",
      mensaje:
        "La cotización quedó con continuidad incompleta. Conviene definir próxima acción y fecha en conjunto.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
