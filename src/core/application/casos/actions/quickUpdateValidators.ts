import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  QuickUpdateCommand,
  QuickUpdateValidation,
} from "./contracts";

const ESTADOS_COMERCIALES_VALIDOS = new Set([
  "sin_cotizar",
  "en_proceso",
  "negociacion",
  "cotizado",
  "aprobado",
  "rechazado",
  "pausado",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

export function validateQuickUpdateCommand(
  command: QuickUpdateCommand,
  caso: CasoNormalizado | null
): QuickUpdateValidation {
  const errores: QuickUpdateValidation["errores"] = [];
  const advertencias: QuickUpdateValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "actualizacion_manual",
    "aplicar_sugerencia",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para esta acción.",
    });
  }

  if (!caso) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_encontrado",
      mensaje: "No se encontró el caso solicitado.",
    });
  }

  if (command.accion === "actualizacion_manual") {
    const accion = (command.payload?.proxima_accion ?? "").trim();
    const fecha = command.payload?.proxima_fecha ?? null;
    const estado = command.payload?.estado_comercial ?? null;

    if (!accion && !fecha && !estado) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "payload_vacio",
        mensaje: "Define una acción, una fecha o un estado comercial.",
      });
    }

    if (fecha && !esFechaIsoDia(fecha)) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "fecha_invalida",
        mensaje: "La fecha debe usar formato YYYY-MM-DD.",
      });
    }

    if (estado && !ESTADOS_COMERCIALES_VALIDOS.has(estado)) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "estado_invalido",
        mensaje: "El estado comercial no es válido para esta acción.",
      });
    }
  }

  if (command.accion === "aplicar_sugerencia" && caso) {
    if (!caso.recomendacion_operativa.accion.trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "sin_recomendacion",
        mensaje: "El caso no tiene recomendación operativa disponible.",
      });
    }
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
