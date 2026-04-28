import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  CierreTecnicoCommand,
  CierreTecnicoValidation,
} from "./contracts";

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: CierreTecnicoCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    payload.fecha_cierre_tecnico ||
      (payload.responsable_cierre ?? "").trim() ||
      (payload.motivo_cierre ?? "").trim() ||
      (payload.observacion_cierre ?? "").trim() ||
      typeof payload.postventa_resuelta === "boolean" ||
      typeof payload.requiere_postventa_adicional === "boolean"
  );
}

export function validateCierreTecnicoCommand(args: {
  command: CierreTecnicoCommand;
  caso: CasoNormalizado | null;
  cierreTecnicoExiste: boolean;
}): CierreTecnicoValidation {
  const { command, caso, cierreTecnicoExiste } = args;
  const errores: CierreTecnicoValidation["errores"] = [];
  const advertencias: CierreTecnicoValidation["advertencias"] = [];

  if (command.accion !== "registrar_cierre_tecnico") {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para cierre técnico.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar cierre técnico.",
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
      mensaje: "Debes completar los datos mínimos del cierre técnico.",
    });
  }

  const fechaCierre = command.payload?.fecha_cierre_tecnico ?? null;
  if (!fechaCierre) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_cierre_tecnico_obligatoria",
      mensaje: "La fecha de cierre técnico es obligatoria.",
    });
  } else if (!esFechaIsoDia(fechaCierre)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_cierre_tecnico_invalida",
      mensaje: "La fecha de cierre técnico debe usar formato YYYY-MM-DD.",
    });
  }

  if (!(command.payload?.responsable_cierre ?? "").trim()) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "responsable_cierre_obligatorio",
      mensaje: "El responsable de cierre es obligatorio.",
    });
  }

  if (command.payload?.requiere_postventa_adicional === true) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "postventa_adicional_pendiente",
      mensaje:
        "No se puede registrar cierre técnico si todavía requiere postventa adicional.",
    });
  }

  if (cierreTecnicoExiste) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "cierre_tecnico_duplicado",
      mensaje: "El caso ya tiene un cierre técnico registrado.",
    });
  }

  if (caso) {
    if (caso.workflow.auditoria?.estado_auditoria !== "conforme") {
      errores.push({
        caso_id: command.caso_id,
        codigo: "cierre_tecnico_requiere_auditoria_conforme",
        mensaje:
          "El cierre técnico solo puede registrarse después de una auditoría conforme.",
      });
    }

    const postventa = caso.workflow.postventa;
    const postventaResuelta =
      !!postventa &&
      ["resuelta", "cerrada"].includes(postventa.estado_postventa) &&
      postventa.conformidad_final === true &&
      postventa.requiere_accion !== true;

    if (!postventaResuelta) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "cierre_tecnico_requiere_postventa_resuelta",
        mensaje:
          "El cierre técnico solo puede registrarse cuando la postventa ya quedó resuelta y sin acciones pendientes.",
      });
    }
  }

  if (command.payload?.postventa_resuelta !== true) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "postventa_resuelta_recomendada",
      mensaje:
        "Conviene dejar evidencia explícita de que la postventa quedó resuelta al registrar el cierre técnico.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
