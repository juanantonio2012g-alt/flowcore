import type { CasoNormalizado } from "@/core/domain/casos";
import type {
  SeguimientoCommand,
  SeguimientoValidation,
} from "./contracts";
import {
  derivarSeguimientoComercial,
  esEstadoComercialSeguimientoAdmitido,
  normalizarSenalesComerciales,
} from "./comercial";
import {
  MENSAJE_CONTENIDO_MINIMO_SEGUIMIENTO,
  tieneContenidoOperativoMinimoSeguimiento,
} from "./minimoOperativo";

const TIPOS_SEGUIMIENTO_VALIDOS = new Set([
  "llamada",
  "whatsapp",
  "correo",
  "reunion",
  "visita",
  "otro",
]);

function esFechaIsoDia(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function hayPayloadUtil(command: SeguimientoCommand) {
  const payload = command.payload ?? {};
  return Boolean(
    (payload.tipo_seguimiento ?? "").trim() ||
      (payload.resultado ?? "").trim() ||
      (payload.proximo_paso ?? "").trim() ||
      (payload.proxima_fecha ?? "").trim() ||
      (payload.estado_comercial ?? "").trim() ||
      (payload.senales_comerciales ?? []).length > 0 ||
      (payload.observaciones_cliente ?? "").trim()
  );
}

export function validateSeguimientoCommand(args: {
  command: SeguimientoCommand;
  caso: CasoNormalizado | null;
  seguimientoExiste: boolean;
}): SeguimientoValidation {
  const { command, caso, seguimientoExiste } = args;
  const errores: SeguimientoValidation["errores"] = [];
  const advertencias: SeguimientoValidation["advertencias"] = [];
  const accionesValidas = new Set([
    "registrar_seguimiento",
    "actualizar_seguimiento",
  ]);

  if (!accionesValidas.has(command.accion)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "accion_invalida",
      mensaje: "La acción solicitada no está soportada para seguimiento.",
    });
  }

  if (!command.caso_id) {
    errores.push({
      codigo: "caso_id_obligatorio",
      mensaje: "El caso es obligatorio para registrar seguimiento.",
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
      mensaje: "Debes completar al menos un dato relevante del seguimiento.",
    });
  }

  const tipo = (command.payload?.tipo_seguimiento ?? "").trim();
  if (tipo && !TIPOS_SEGUIMIENTO_VALIDOS.has(tipo)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "tipo_seguimiento_invalido",
      mensaje: "El tipo de seguimiento no es válido.",
    });
  }

  const fecha = command.payload?.proxima_fecha ?? null;
  if (fecha && !esFechaIsoDia(fecha)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "fecha_invalida",
      mensaje: "La próxima fecha debe usar formato YYYY-MM-DD.",
    });
  }

  const estado = (command.payload?.estado_comercial ?? "").trim();
  if (estado && !esEstadoComercialSeguimientoAdmitido(estado)) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_invalido",
      mensaje: "El estado comercial no es válido para seguimiento.",
    });
  }

  const senalesRecibidas = command.payload?.senales_comerciales ?? [];
  const senalesNormalizadas = normalizarSenalesComerciales(senalesRecibidas);
  if (senalesNormalizadas.length !== senalesRecibidas.length) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "senales_invalidas",
      mensaje: "Las señales comerciales complementarias no son válidas.",
    });
  }

  const lecturaComercial = derivarSeguimientoComercial({
    estadoComercial: command.payload?.estado_comercial ?? null,
    senalesComerciales: command.payload?.senales_comerciales ?? [],
  });

  if (
    command.accion === "registrar_seguimiento" &&
    !tieneContenidoOperativoMinimoSeguimiento({
      resultado: command.payload?.resultado ?? null,
      proximo_paso: command.payload?.proximo_paso ?? null,
      proxima_fecha: command.payload?.proxima_fecha ?? null,
      estado_comercial: lecturaComercial.estado_principal,
      observaciones_cliente: command.payload?.observaciones_cliente ?? null,
    })
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "contenido_operativo_minimo_requerido",
      mensaje: MENSAJE_CONTENIDO_MINIMO_SEGUIMIENTO,
    });
  }

  if (senalesNormalizadas.length > 0 && !lecturaComercial.estado_principal) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "estado_principal_obligatorio",
      mensaje:
        "Las señales comerciales complementarias requieren un estado comercial principal.",
    });
  }

  if (
    lecturaComercial.estado_principal &&
    ["aprobado", "rechazado"].includes(lecturaComercial.estado_principal) &&
    lecturaComercial.senales_comerciales.length > 0
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "senales_no_compatibles",
      mensaje:
        "Un estado comercial resuelto no debe combinarse con señales complementarias abiertas.",
    });
  }

  if (command.accion === "actualizar_seguimiento" && !command.seguimiento_id) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "seguimiento_id_obligatorio",
      mensaje: "Para actualizar seguimiento debes indicar seguimiento_id.",
    });
  }

  if (
    command.accion === "actualizar_seguimiento" &&
    command.seguimiento_id &&
    !seguimientoExiste
  ) {
    errores.push({
      caso_id: command.caso_id,
      codigo: "seguimiento_no_encontrado",
      mensaje: "No se encontró el seguimiento a actualizar.",
    });
  }

  const proximoPaso = (command.payload?.proximo_paso ?? "").trim();
  if (!!proximoPaso !== !!fecha) {
    advertencias.push({
      caso_id: command.caso_id,
      codigo: "continuidad_incompleta",
      mensaje:
        "Conviene registrar próximo paso y próxima fecha juntos para sostener continuidad completa.",
    });
  }

  return {
    ok: errores.length === 0,
    errores,
    advertencias,
  };
}
