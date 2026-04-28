export const MENSAJE_CONTENIDO_MINIMO_LOGISTICA =
  "Completa una fecha programada, un responsable o una observación logística. Si confirmas la entrega, registra también la fecha de entrega.";

type LogisticaContenidoOperativoInput = {
  fecha_programada?: string | null;
  responsable?: string | null;
  observacion_logistica?: string | null;
  confirmacion_entrega?: boolean | null;
  fecha_entrega?: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

export function tieneContenidoOperativoMinimoLogistica(
  payload: LogisticaContenidoOperativoInput
) {
  const tieneFechaProgramada =
    normalizarTexto(payload.fecha_programada).length > 0;
  const tieneResponsable = normalizarTexto(payload.responsable).length > 0;
  const tieneObservacion =
    normalizarTexto(payload.observacion_logistica).length > 0;
  const tieneEntregaConfirmadaConFecha =
    payload.confirmacion_entrega === true &&
    normalizarTexto(payload.fecha_entrega).length > 0;

  return (
    tieneFechaProgramada ||
    tieneResponsable ||
    tieneObservacion ||
    tieneEntregaConfirmadaConFecha
  );
}
