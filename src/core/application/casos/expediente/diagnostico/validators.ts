import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  DiagnosticoCommand,
  DiagnosticoValidation,
} from "./contracts";

const NIVELES_CERTEZA_VALIDOS = new Set([
  "muy_bajo",
  "bajo",
  "medio",
  "alto",
  "muy_alto",
  "confirmado",
]);

const CATEGORIAS_CASO_VALIDAS = new Set([
  "patologia_superficie",
  "humedad_filtracion",
  "grietas_fisuras",
  "desprendimiento_delaminacion",
  "falla_acabado",
  "falla_aplicacion",
  "compatibilidad_materiales",
  "preparacion_superficie",
  "mantenimiento_reparacion",
  "otro",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: DiagnosticoCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    (payload.problematica_identificada ?? "").trim() ||
      (payload.causa_probable ?? "").trim() ||
      (payload.nivel_certeza ?? "").trim() ||
      (payload.categoria_caso ?? "").trim() ||
      (payload.solucion_recomendada ?? "").trim() ||
      (payload.producto_recomendado ?? "").trim() ||
      (payload.proceso_sugerido ?? "").trim() ||
      (payload.observaciones_tecnicas ?? "").trim() ||
      payload.fecha_validacion ||
      typeof payload.requiere_validacion === "boolean"
  );
}

export function validateDiagnosticoCommand(args: {
  command: DiagnosticoCommand;
  caso: CasoNormalizado | null;
  diagnosticoExiste: boolean;
}): DiagnosticoValidation {
  const { command, caso, diagnosticoExiste } = args;
  const errores: DiagnosticoValidation["errores"] = [];
  const advertencias: DiagnosticoValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_diagnostico",
    "actualizar_diagnostico",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para diagnóstico.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar diagnóstico.",
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
      mensaje: "Debes completar al menos un dato relevante del diagnóstico.",
    });
  }

  if (command.accion === "registrar_diagnostico") {
    if (!(command.payload?.problematica_identificada ?? "").trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "problematica_obligatoria",
        mensaje: "La problemática identificada es obligatoria.",
      });
    }

    if (!(command.payload?.causa_probable ?? "").trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "causa_probable_obligatoria",
        mensaje: "La causa probable es obligatoria.",
      });
    }

    if (!(command.payload?.nivel_certeza ?? "").trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "nivel_certeza_obligatorio",
        mensaje: "El nivel de certeza es obligatorio.",
      });
    }

    if (!(command.payload?.solucion_recomendada ?? "").trim()) {
      errores.push({
        caso_id: command.caso_id,
        codigo: "solucion_obligatoria",
        mensaje: "La solución recomendada es obligatoria.",
      });
    }
  }

  const nivelCerteza = (command.payload?.nivel_certeza ?? "").trim();
  if (nivelCerteza && !NIVELES_CERTEZA_VALIDOS.has(nivelCerteza)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "nivel_certeza_invalido",
      mensaje: "El nivel de certeza no es válido para diagnóstico.",
    });
  }

  const categoriaCaso = (command.payload?.categoria_caso ?? "").trim();
  if (categoriaCaso && !CATEGORIAS_CASO_VALIDAS.has(categoriaCaso)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "categoria_caso_invalida",
      mensaje: "La categoría del caso no es válida para diagnóstico.",
    });
  }

  const fechaValidacion = command.payload?.fecha_validacion ?? null;
  if (fechaValidacion && !esFechaIsoDia(fechaValidacion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_validacion_invalida",
      mensaje: "La fecha de validación debe usar formato YYYY-MM-DD.",
    });
  }

  if (command.accion === "actualizar_diagnostico" && !command.diagnostico_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "diagnostico_id_obligatorio",
      mensaje: "Para actualizar diagnóstico debes indicar diagnostico_id.",
    });
  }

  if (
    command.accion === "actualizar_diagnostico" &&
    command.diagnostico_id &&
    !diagnosticoExiste
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "diagnostico_no_encontrado",
      mensaje: "No se encontró el diagnóstico a actualizar.",
    });
  }

  const requiereValidacion = command.payload?.requiere_validacion;
  if (requiereValidacion === true && !fechaValidacion) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "validacion_sin_fecha",
      mensaje:
        "El diagnóstico requiere validación, pero no se definió fecha de validación.",
    });
  }

  if (requiereValidacion === false && fechaValidacion) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "fecha_validacion_sin_requerimiento",
      mensaje:
        "Se informó una fecha de validación aunque el diagnóstico no requiere validación.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
