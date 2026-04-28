type Args = {
  proximaAccion?: string | null;
  seguimientoProximoPaso?: string | null;
  tieneInforme?: boolean;
  tieneDiagnostico?: boolean;
  tieneCotizacion?: boolean;
  tieneSeguimiento?: boolean;
};

export function derivarProximaAccionReal(args: Args) {
  if (args.proximaAccion) return args.proximaAccion;
  if (args.seguimientoProximoPaso) return args.seguimientoProximoPaso;
  if (!args.tieneInforme) return "Registrar informe técnico";
  if (!args.tieneDiagnostico) return "Realizar diagnóstico";
  if (!args.tieneCotizacion) return "Preparar cotización";
  if (!args.tieneSeguimiento) return "Dar seguimiento comercial";
  return "Caso en seguimiento";
}

export function derivarProximaFechaReal(args: {
  proximaFecha?: string | null;
  seguimientoProximaFecha?: string | null;
}) {
  return args.proximaFecha || args.seguimientoProximaFecha || null;
}
