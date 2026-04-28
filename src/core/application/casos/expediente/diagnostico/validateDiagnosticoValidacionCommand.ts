import type { CasoNormalizado } from "@/core/domain/casos";
import { normalizarTextoNullable } from "@/core/domain/casos/rules";
import type {
  DiagnosticoValidacionCommand,
  DiagnosticoValidacionValidation,
} from "./contracts";

const RESULTADOS_VALIDOS = new Set(["validado", "observado", "rechazado"]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

export function validateDiagnosticoValidacionCommand(args: {
  command: DiagnosticoValidacionCommand;
  caso: CasoNormalizado | null;
  diagnosticoExiste: boolean;
}): DiagnosticoValidacionValidation {
  const { command, caso, diagnosticoExiste } = args;
  const errores: DiagnosticoValidacionValidation["errores"] = [];
  const advertencias: DiagnosticoValidacionValidation["advertencias"] = [];

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para validar el diagnóstico.",
    });
  }

  if (!command.diagnostico_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "diagnostico_id_obligatorio",
      mensaje: "Debes indicar el diagnóstico que será validado.",
    });
  }

  if (!caso) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "caso_no_encontrado",
      mensaje: "No se encontró el caso solicitado.",
    });
  }

  if (!diagnosticoExiste) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "diagnostico_no_encontrado",
      mensaje: "No se encontró el diagnóstico a validar.",
    });
  }

  const resultadoValidacion = normalizarTextoNullable(
    command.payload.resultado_validacion
  );
  if (!resultadoValidacion || !RESULTADOS_VALIDOS.has(resultadoValidacion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "resultado_validacion_invalido",
      mensaje: "El resultado de validación no es válido.",
    });
  }

  const fechaValidacion = command.payload.fecha_validacion ?? null;
  if (fechaValidacion && !esFechaIsoDia(fechaValidacion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_validacion_invalida",
      mensaje: "La fecha de validación debe usar formato YYYY-MM-DD.",
    });
  }

  if (
    resultadoValidacion === "rechazado" &&
    !normalizarTextoNullable(command.payload.observacion_validacion)
  ) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "rechazo_sin_observacion",
      mensaje:
        "El diagnóstico quedó rechazado sin observación adicional. Conviene registrar el criterio de rechazo.",
    });
  }

  if (
    resultadoValidacion === "observado" &&
    !normalizarTextoNullable(command.payload.observacion_validacion)
  ) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "observacion_validacion_vacia",
      mensaje:
        "La validación quedó observada sin detalle adicional. Conviene registrar la observación principal.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
