import { recomendarAccionOperativa } from "@/lib/recomendacion/operativa";

type PrioridadInicial = "urgente" | "alta" | "media" | "baja" | null;

export type ContinuidadInicialCaso = {
  proxima_accion: string;
  proxima_fecha: string | null;
};

export function derivarContinuidadInicialCaso(args: {
  prioridad: PrioridadInicial;
}): ContinuidadInicialCaso {
  const recomendacion = recomendarAccionOperativa({
    prioridad: args.prioridad,
    estadoComercial: null,
    estadoTecnico: null,
    proximaAccion: null,
    proximaFecha: null,
    requiereValidacion: false,
    tieneInforme: false,
    tieneDiagnostico: false,
    tieneCotizacion: false,
    tieneSeguimiento: false,
  });

  return {
    proxima_accion: recomendacion.accion,
    proxima_fecha: recomendacion.fechaSugerida,
  };
}
