type Args = {
  estadoComercial?: string | null;
  seguimientoEstadoComercial?: string | null;
  cotizacionEstado?: string | null;
  tieneCotizacion?: boolean;
  tieneSeguimiento?: boolean;
};

export function derivarEstadoComercialReal(args: Args) {
  if (args.seguimientoEstadoComercial) return args.seguimientoEstadoComercial;
  if (args.estadoComercial) return args.estadoComercial;
  if (args.cotizacionEstado) return args.cotizacionEstado;
  if (args.tieneCotizacion) return "cotizado";
  if (args.tieneSeguimiento) return "en_proceso";
  return "sin_cotizar";
}
