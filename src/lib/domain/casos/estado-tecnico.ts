type Args = {
  estadoTecnico?: string | null;
  tieneInforme?: boolean;
  tieneDiagnostico?: boolean;
  tieneCotizacion?: boolean;
};

export function derivarEstadoTecnicoReal(args: Args) {
  if (args.tieneCotizacion) return "solucion_definida";
  if (args.tieneDiagnostico) return "diagnosticado";
  if (args.tieneInforme) return "informe_recibido";
  if (args.estadoTecnico) return args.estadoTecnico;
  return "solicitud_recibida";
}
