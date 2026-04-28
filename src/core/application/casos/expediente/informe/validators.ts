import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  InformeCommand,
  InformeValidation,
} from "./contracts";

const ESTADOS_REVISION_VALIDOS = new Set([
  "pendiente_revision",
  "en_revision",
  "revisado",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: InformeCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    (payload.fecha_recepcion ?? "").trim() ||
      (payload.resumen_tecnico ?? "").trim() ||
      (payload.hallazgos_principales ?? "").trim() ||
      (payload.estado_revision ?? "").trim() ||
      (payload.evidencias?.length ?? 0) > 0
  );
}

export function validateInformeCommand(args: {
  command: InformeCommand;
  caso: CasoNormalizado | null;
  informeExiste: boolean;
  evidenciasExistentes: number;
}): InformeValidation {
  const { command, caso, informeExiste, evidenciasExistentes } = args;
  const errores: InformeValidation["errores"] = [];
  const advertencias: InformeValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_informe",
    "actualizar_informe",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para informe.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar informe.",
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
      mensaje: "Debes completar al menos un dato relevante del informe.",
    });
  }

  const fecha = command.payload?.fecha_recepcion ?? null;
  if (fecha && !esFechaIsoDia(fecha)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_invalida",
      mensaje: "La fecha de recepción debe usar formato YYYY-MM-DD.",
    });
  }

  const estadoRevision = (command.payload?.estado_revision ?? "").trim();
  if (estadoRevision && !ESTADOS_REVISION_VALIDOS.has(estadoRevision)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_revision_invalido",
      mensaje: "El estado de revisión no es válido para informe.",
    });
  }

  if (command.accion === "actualizar_informe" && !command.informe_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "informe_id_obligatorio",
      mensaje: "Para actualizar informe debes indicar informe_id.",
    });
  }

  if (
    command.accion === "actualizar_informe" &&
    command.informe_id &&
    !informeExiste
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "informe_no_encontrado",
      mensaje: "No se encontró el informe a actualizar.",
    });
  }

  const evidencias = command.payload?.evidencias ?? [];
  const totalEvidencias = evidenciasExistentes + evidencias.length;

  if (command.accion === "registrar_informe" && evidencias.length === 0) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "evidencia_obligatoria",
      mensaje: "El informe requiere al menos una foto de evidencia visual.",
    });
  }

  if (command.accion === "actualizar_informe" && totalEvidencias === 0) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "sin_evidencia",
      mensaje:
        "El informe quedará sin evidencia visual asociada, lo que debilita la base documental del caso.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
