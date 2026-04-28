const CAMPOS_VALIDACION_DIAGNOSTICO = [
  "validado_por",
  "resultado_validacion",
  "observacion_validacion",
] as const;

type DiagnosticoValidacionCompatFields = {
  validado_por: string | null;
  resultado_validacion: string | null;
  observacion_validacion: string | null;
};

type ErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function textoError(error: ErrorLike | null | undefined) {
  return [error?.message, error?.details, error?.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

export function esErrorEsquemaValidacionDiagnosticoFaltante(
  error: unknown
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const texto = textoError(error as ErrorLike);

  if (!texto) {
    return false;
  }

  const mencionaCampo = CAMPOS_VALIDACION_DIAGNOSTICO.some((campo) =>
    texto.includes(campo)
  );
  const mencionaAusencia =
    texto.includes("does not exist") ||
    texto.includes("could not find") ||
    texto.includes("schema cache") ||
    texto.includes("unknown column");

  return mencionaCampo && mencionaAusencia;
}

export function completarCamposValidacionDiagnosticoCompat<T extends object>(
  record: T | null
): (T & DiagnosticoValidacionCompatFields) | null {
  if (!record) {
    return null;
  }

  return {
    ...record,
    validado_por: null,
    resultado_validacion: null,
    observacion_validacion: null,
  };
}

export function completarListaValidacionDiagnosticoCompat<T extends object>(
  records: T[] | null | undefined
): Array<T & DiagnosticoValidacionCompatFields> {
  if (!records?.length) {
    return [];
  }

  return records.map((record) =>
    completarCamposValidacionDiagnosticoCompat(record)
  ) as Array<T & DiagnosticoValidacionCompatFields>;
}

export function mensajeSchemaValidacionDiagnosticoIncompleta() {
  return "La validacion formal del diagnostico todavia no esta disponible en este entorno porque falta aplicar la migracion dev_assistant/sql/alter-diagnosticos-add-validacion-formal.sql.";
}
