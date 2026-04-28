import type { CasoWorklistItem } from "../contracts";
import type {
  BulkUpdateCommand,
  BulkUpdateValidation,
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

export function validateBulkUpdateCommand(
  command: BulkUpdateCommand,
  casos: CasoWorklistItem[]
): BulkUpdateValidation {
  const errores: BulkUpdateValidation["errores"] = [];
  const advertencias: BulkUpdateValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "actualizacion_manual",
    "aplicar_sugerencia",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada.",
    });
  }

  if (!command.caso_ids.length) {
    errores.push({
      codigo: "sin_casos",
      mensaje: "Selecciona al menos un caso.",
    });
  }

  const idsDisponibles = new Set(casos.map((caso) => caso.id));
  for (const casoId of command.caso_ids) {
    if (!idsDisponibles.has(casoId)) {
      errores.push({
        caso_id: casoId,
        codigo: "caso_no_encontrado",
        mensaje: `El caso ${casoId.slice(0, 8)} no está disponible para esta acción.`,
      });
    }
  }

  if (command.accion === "actualizacion_manual") {
    const fecha = command.payload?.proxima_fecha ?? null;
    const estado = command.payload?.estado_comercial ?? null;

    if (!fecha && !estado) {
      errores.push({
        codigo: "payload_vacio",
        mensaje: "Define una fecha nueva o un estado comercial.",
      });
    }

    if (fecha && !esFechaIsoDia(fecha)) {
      errores.push({
        codigo: "fecha_invalida",
        mensaje: "La fecha nueva debe usar formato YYYY-MM-DD.",
      });
    }

    if (estado && !ESTADOS_COMERCIALES_VALIDOS.has(estado)) {
      errores.push({
        codigo: "estado_invalido",
        mensaje: "El estado comercial no es válido para esta acción.",
      });
    }
  }

  if (command.accion === "aplicar_sugerencia") {
    for (const caso of casos) {
      if (!command.caso_ids.includes(caso.id)) continue;

      if (!caso.recomendacion_accion.trim()) {
        errores.push({
          caso_id: caso.id,
          codigo: "sin_recomendacion",
          mensaje: `El caso ${caso.id.slice(0, 8)} no tiene recomendación operativa.`,
        });
      }
    }
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
