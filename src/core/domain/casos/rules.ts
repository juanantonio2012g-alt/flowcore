import type { CasoNormalizado as CasoNormalizadoBase } from "@/lib/domain/casos";
import type { EstadoCasoNormalizado } from "./types";

const ESTADO_LABELS: Record<EstadoCasoNormalizado, string> = {
  solicitud: "Solicitud",
  informe: "Informe",
  diagnostico: "Diagnóstico",
  validacion: "Validación",
  cotizacion: "Cotización",
  seguimiento: "Seguimiento",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  pausado: "Pausado",
  cerrado: "Caso cerrado",
};

export function derivarEstadoCaso(
  caso: CasoNormalizadoBase
): EstadoCasoNormalizado {
  if (caso.requiere_validacion) return "validacion";

  if (
    caso.estado_comercial_real === "aprobado" ||
    caso.estado_comercial_real === "rechazado" ||
    caso.estado_comercial_real === "pausado"
  ) {
    return caso.estado_comercial_real;
  }

  if (caso.estado_tecnico_real === "solicitud_recibida") return "solicitud";

  if (
    caso.estado_tecnico_real === "solucion_definida" ||
    caso.estado_comercial_real === "sin_cotizar" ||
    caso.estado_comercial_real === "cotizado"
  ) {
    return "cotizacion";
  }

  if (
    caso.estado_tecnico_real === "informe_recibido" ||
    caso.estado_tecnico_real === "informe_tecnico_recibido"
  ) {
    return "informe";
  }

  if (caso.estado_tecnico_real === "diagnosticado") return "diagnostico";

  if (
    caso.estado_comercial_real === "en_proceso" ||
    caso.estado_comercial_real === "negociacion" ||
    caso.estado_comercial_real === "esperando_cliente"
  ) {
    return "seguimiento";
  }

  return "solicitud";
}

export function obtenerEstadoLabel(estado: EstadoCasoNormalizado) {
  return ESTADO_LABELS[estado];
}

export function normalizarTextoNullable(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio || null;
}

export type DerivarRequiereValidacionDiagnosticoInput = {
  tieneDiagnostico?: boolean;
  requiereValidacionManual?: boolean | null;
  tieneInformeTecnico?: boolean;
  nivelCerteza?: string | null;
  problematicaIdentificada?: string | null;
  causaProbable?: string | null;
  categoriaCaso?: string | null;
  solucionRecomendada?: string | null;
  categoriaProbableAgente?: string | null;
  resultadoValidacion?: string | null;
  validadoPor?: string | null;
  fechaValidacion?: string | null;
  observacionValidacion?: string | null;
};

export type DerivarRequiereValidacionDiagnosticoOutput = {
  requiere_validacion_manual: boolean;
  requiere_validacion_derivada: boolean;
  requiere_validacion_final: boolean;
  motivo_validacion: string[];
};

export type DiagnosticoResultadoValidacion =
  | "validado"
  | "observado"
  | "rechazado";

export type DerivarEstadoValidacionDiagnosticoOutput =
  DerivarRequiereValidacionDiagnosticoOutput & {
    motivos_validacion: string[];
    validacion_pendiente: boolean;
    validacion_resuelta: boolean;
    resultado_validacion: DiagnosticoResultadoValidacion | null;
    validado_por: string | null;
    fecha_validacion: string | null;
    observacion_validacion: string | null;
  };

function normalizarTextoComparacion(valor: string | null | undefined) {
  return (valor ?? "").trim().toLowerCase();
}

function normalizarResultadoValidacion(
  valor: string | null | undefined
): DiagnosticoResultadoValidacion | null {
  const normalizado = normalizarTextoComparacion(valor);

  if (
    normalizado === "validado" ||
    normalizado === "observado" ||
    normalizado === "rechazado"
  ) {
    return normalizado;
  }

  return null;
}

function esCertezaMediaOMenor(nivelCerteza: string | null | undefined) {
  const niveles: Record<string, number> = {
    muy_bajo: 0,
    bajo: 1,
    medio: 2,
    alto: 3,
    muy_alto: 4,
    confirmado: 5,
  };
  const nivel = normalizarTextoComparacion(nivelCerteza);
  if (!nivel) return false;
  const score = niveles[nivel];
  return typeof score === "number" && score <= niveles.medio;
}

function faltantesClaveDiagnostico(args: {
  problematicaIdentificada?: string | null;
  causaProbable?: string | null;
  categoriaCaso?: string | null;
  solucionRecomendada?: string | null;
}) {
  const faltantes: string[] = [];

  if (!normalizarTextoNullable(args.problematicaIdentificada)) {
    faltantes.push("problemática identificada");
  }

  if (!normalizarTextoNullable(args.causaProbable)) {
    faltantes.push("causa probable");
  }

  if (!normalizarTextoNullable(args.categoriaCaso)) {
    faltantes.push("categoría del caso");
  }

  if (!normalizarTextoNullable(args.solucionRecomendada)) {
    faltantes.push("solución recomendada");
  }

  return faltantes;
}

function derivarBaseRequiereValidacionDiagnostico(
  input: DerivarRequiereValidacionDiagnosticoInput
): DerivarRequiereValidacionDiagnosticoOutput {
  const requiereValidacionManual = input.requiereValidacionManual === true;

  if (input.tieneDiagnostico === false) {
    return {
      requiere_validacion_manual: requiereValidacionManual,
      requiere_validacion_derivada: false,
      requiere_validacion_final: requiereValidacionManual,
      motivo_validacion: [],
    };
  }

  const motivos = new Set<string>();
  const certezaMediaOMenor = esCertezaMediaOMenor(input.nivelCerteza);

  if (certezaMediaOMenor) {
    motivos.add("Nivel de certeza medio o menor.");
  }

  if (input.tieneInformeTecnico === false) {
    motivos.add("No existe informe técnico asociado.");
  }

  const faltantes = faltantesClaveDiagnostico(input);
  const bajaSolidezPorFaltantes =
    faltantes.length >= 2 &&
    (certezaMediaOMenor || input.tieneInformeTecnico === false);
  if (bajaSolidezPorFaltantes) {
    motivos.add(
      `El diagnóstico tiene señales de baja solidez: faltan campos clave (${faltantes.join(", ")}).`
    );
  }

  const categoriaCaso = normalizarTextoComparacion(input.categoriaCaso);
  const categoriaAgente = normalizarTextoComparacion(input.categoriaProbableAgente);
  if (categoriaCaso && categoriaAgente && categoriaCaso !== categoriaAgente) {
    motivos.add("Existe desalineación entre la categoría humana y la categoría sugerida por el agente.");
  }

  const motivo_validacion = Array.from(motivos);
  const requiere_validacion_derivada = motivo_validacion.length > 0;

  return {
    requiere_validacion_manual: requiereValidacionManual,
    requiere_validacion_derivada,
    requiere_validacion_final:
      requiereValidacionManual || requiere_validacion_derivada,
    motivo_validacion,
  };
}

export function derivarEstadoValidacionDiagnostico(
  input: DerivarRequiereValidacionDiagnosticoInput
): DerivarEstadoValidacionDiagnosticoOutput {
  const base = derivarBaseRequiereValidacionDiagnostico(input);
  const resultadoValidacion = normalizarResultadoValidacion(
    input.resultadoValidacion
  );
  const validacionResuelta =
    resultadoValidacion === "validado" || resultadoValidacion === "rechazado";
  const validacionPendiente =
    resultadoValidacion === "observado" ||
    (base.requiere_validacion_final && !validacionResuelta);

  return {
    ...base,
    requiere_validacion_final: base.requiere_validacion_final,
    motivos_validacion: base.motivo_validacion,
    validacion_pendiente: validacionPendiente,
    validacion_resuelta: validacionResuelta,
    resultado_validacion: resultadoValidacion,
    validado_por: normalizarTextoNullable(input.validadoPor),
    fecha_validacion: input.fechaValidacion ?? null,
    observacion_validacion: normalizarTextoNullable(
      input.observacionValidacion
    ),
  };
}

export function derivarRequiereValidacionDiagnostico(
  input: DerivarRequiereValidacionDiagnosticoInput
): DerivarRequiereValidacionDiagnosticoOutput {
  const estadoValidacion = derivarEstadoValidacionDiagnostico(input);

  return {
    requiere_validacion_manual: estadoValidacion.requiere_validacion_manual,
    requiere_validacion_derivada: estadoValidacion.requiere_validacion_derivada,
    requiere_validacion_final: estadoValidacion.requiere_validacion_final,
    motivo_validacion: estadoValidacion.motivo_validacion,
  };
}

export function inferirEstadoComercialDesdeAccion(
  accion: string | null | undefined,
  actual: string | null | undefined
) {
  const normalizada = (accion ?? "").trim().toLowerCase();

  if (normalizada.includes("seguimiento comercial")) return "en_proceso";
  if (
    normalizada.includes("preparar cotización") ||
    normalizada.includes("preparar cotizacion")
  ) {
    return "sin_cotizar";
  }
  if (
    normalizada.includes("coordinar ejecución") ||
    normalizada.includes("coordinar ejecucion")
  ) {
    return "aprobado";
  }
  if (normalizada.includes("revisar estrategia")) return "pausado";

  return normalizarTextoNullable(actual);
}

export function resolverTimestamp(timestamp?: string) {
  return timestamp ?? new Date().toISOString();
}
