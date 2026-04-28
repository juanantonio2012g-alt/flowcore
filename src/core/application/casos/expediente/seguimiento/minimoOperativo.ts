export const MENSAJE_CONTENIDO_MINIMO_SEGUIMIENTO =
  "Completa un resultado o define próximo paso y fecha para registrar un seguimiento útil.";

type SeguimientoContenidoOperativoInput = {
  resultado?: string | null;
  proximo_paso?: string | null;
  proxima_fecha?: string | null;
  estado_comercial?: string | null;
  observaciones_cliente?: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

function esEstadoComercialResuelto(estado: string | null | undefined) {
  return estado === "aprobado" || estado === "rechazado";
}

export function tieneContenidoOperativoMinimoSeguimiento(
  payload: SeguimientoContenidoOperativoInput
) {
  const tieneResultado = normalizarTexto(payload.resultado).length > 0;
  const tieneContinuidadCompleta =
    normalizarTexto(payload.proximo_paso).length > 0 &&
    normalizarTexto(payload.proxima_fecha).length > 0;
  const tieneContextoMinimoEstadoResuelto =
    esEstadoComercialResuelto(payload.estado_comercial) &&
    (tieneResultado ||
      normalizarTexto(payload.observaciones_cliente).length > 0);

  return (
    tieneResultado ||
    tieneContinuidadCompleta ||
    tieneContextoMinimoEstadoResuelto
  );
}
