export const MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO = 15;

export const MENSAJE_CONTENIDO_MINIMO_ALTA_CASO =
  "La descripción no ofrece base suficiente para interpretar el caso con seguridad. Agrega síntoma, contexto o necesidad concreta.";

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim().replace(/\s+/g, " ");
}

export function tieneDescripcionMinimaAltaCaso(
  descripcion: string | null | undefined
) {
  return (
    normalizarTexto(descripcion).length >= MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO
  );
}
