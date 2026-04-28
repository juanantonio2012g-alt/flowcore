import type { RiesgoCaso } from "./types";

type Args = {
  slaNivel: "rojo" | "amarillo" | "verde";
  estadoComercialReal: string;
};

export function derivarRiesgoCaso(args: Args): RiesgoCaso {
  if (
    args.slaNivel === "rojo" ||
    args.estadoComercialReal === "rechazado" ||
    args.estadoComercialReal === "pausado"
  ) {
    return "alto";
  }

  if (args.slaNivel === "amarillo" || args.estadoComercialReal === "en_proceso") {
    return "medio";
  }

  return "bajo";
}
