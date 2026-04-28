import type { CasoNormalizado } from "@/core/domain/casos";
import type { AuditoriaCommand, AuditoriaValidation } from "./contracts";

const ESTADOS_AUDITORIA_VALIDOS = new Set([
  "pendiente",
  "en_revision",
  "conforme",
  "con_observaciones",
  "requiere_correccion",
  "cerrada",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: AuditoriaCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    payload.fecha_auditoria ||
      (payload.responsable_auditoria ?? "").trim() ||
      (payload.estado_auditoria ?? "").trim() ||
      (payload.observaciones_auditoria ?? "").trim() ||
      typeof payload.conformidad_cliente === "boolean" ||
      typeof payload.requiere_correccion === "boolean" ||
      payload.fecha_cierre_tecnico ||
      (payload.proxima_accion ?? "").trim() ||
      payload.proxima_fecha
  );
}

export function validateAuditoriaCommand(args: {
  command: AuditoriaCommand;
  caso: CasoNormalizado | null;
  auditoriaExiste: boolean;
}): AuditoriaValidation {
  const { command, caso, auditoriaExiste } = args;
  const errores: AuditoriaValidation["errores"] = [];
  const advertencias: AuditoriaValidation["advertencias"] = [];
  const accionesValidas = new Set(["registrar_auditoria", "actualizar_auditoria"]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para auditoría.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar auditoría.",
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
      mensaje: "Debes completar al menos un dato relevante de auditoría.",
    });
  }

  const estado = (command.payload?.estado_auditoria ?? "").trim();
  if (estado && !ESTADOS_AUDITORIA_VALIDOS.has(estado)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_auditoria_invalido",
      mensaje: "El estado de auditoría no es válido.",
    });
  }

  const fechaAuditoria = command.payload?.fecha_auditoria ?? null;
  if (fechaAuditoria && !esFechaIsoDia(fechaAuditoria)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_auditoria_invalida",
      mensaje: "La fecha de auditoría debe usar formato YYYY-MM-DD.",
    });
  }

  const fechaCierreTecnico = command.payload?.fecha_cierre_tecnico ?? null;
  if (fechaCierreTecnico && !esFechaIsoDia(fechaCierreTecnico)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_cierre_tecnico_invalida",
      mensaje: "La fecha de cierre técnico debe usar formato YYYY-MM-DD.",
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

  if (command.accion === "actualizar_auditoria" && !command.auditoria_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "auditoria_id_obligatorio",
      mensaje: "Para actualizar auditoría debes indicar auditoria_id.",
    });
  }

  if (command.accion === "actualizar_auditoria" && command.auditoria_id && !auditoriaExiste) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "auditoria_no_encontrada",
      mensaje: "No se encontró el registro de auditoría a actualizar.",
    });
  }

  if (estado === "requiere_correccion" && command.payload?.requiere_correccion !== true) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "requiere_correccion_consistente",
      mensaje: "El estado exige corrección y conviene marcarla explícitamente en el payload.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
