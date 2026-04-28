const CAMPOS_SENALES_COMERCIALES = ["senales_comerciales"] as const;

type ErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type SeguimientoCompatFields = {
  senales_comerciales: string[];
};

function textoError(error: ErrorLike | null | undefined) {
  return [error?.message, error?.details, error?.hint]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

export function esErrorEsquemaSeguimientoComercialFaltante(
  error: unknown
): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const texto = textoError(error as ErrorLike);
  if (!texto) {
    return false;
  }

  const mencionaCampo = CAMPOS_SENALES_COMERCIALES.some((campo) =>
    texto.includes(campo)
  );
  const mencionaAusencia =
    texto.includes("does not exist") ||
    texto.includes("could not find") ||
    texto.includes("schema cache") ||
    texto.includes("unknown column");

  return mencionaCampo && mencionaAusencia;
}

export function completarCamposSeguimientoComercialCompat<T extends object>(
  record: T | null
): (T & SeguimientoCompatFields) | null {
  if (!record) {
    return null;
  }

  return {
    ...record,
    senales_comerciales: [],
  };
}

export function completarListaSeguimientoComercialCompat<T extends object>(
  records: T[] | null | undefined
): Array<T & SeguimientoCompatFields> {
  if (!records?.length) {
    return [];
  }

  return records.map((record) =>
    completarCamposSeguimientoComercialCompat(record)
  ) as Array<T & SeguimientoCompatFields>;
}
