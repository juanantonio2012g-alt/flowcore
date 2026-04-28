export type NivelRelacional = "bajo" | "medio" | "alto";
export type NivelClaridad = "baja" | "media" | "alta";

export type PerfilRelacionalAuto = {
  confianza: NivelRelacional;
  friccion: NivelRelacional;
  desgaste: NivelRelacional;
  claridad: NivelClaridad;
  conversion: NivelRelacional;
  observacion: string;
};

type Riesgo = "alto" | "medio" | "bajo";

type Args = {
  createdAt?: string | null;
  riesgo: Riesgo;
  estadoComercial?: string | null;
  proximaAccion?: string | null;
  proximaFecha?: string | null;
  requiereValidacion?: boolean;
  tieneCotizacion?: boolean;
  cotizacionEstado?: string | null;
  tieneSeguimiento?: boolean;
};

function diasAbierto(createdAt?: string | null) {
  if (!createdAt) return 0;
  const inicio = new Date(createdAt);
  if (Number.isNaN(inicio.getTime())) return 0;
  const diff = Date.now() - inicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function derivarPerfilRelacionalCaso(args: Args): PerfilRelacionalAuto {
  const dias = diasAbierto(args.createdAt);
  const estado = (args.estadoComercial ?? "").toLowerCase();
  const cotizacionEstado = (args.cotizacionEstado ?? "").toLowerCase();

  const sinAccion = !args.proximaAccion;
  const sinFecha = !args.proximaFecha;
  const pausadoORechazado =
    estado === "pausado" ||
    estado === "rechazado" ||
    cotizacionEstado === "rechazado" ||
    cotizacionEstado === "rechazada";

  const aprobado =
    estado === "aprobado" ||
    cotizacionEstado === "aprobado" ||
    cotizacionEstado === "aprobada";

  const enMovimiento =
    estado === "en_proceso" ||
    estado === "negociacion" ||
    estado === "cotizado" ||
    !!args.tieneSeguimiento ||
    !!args.tieneCotizacion;

  let confianza: NivelRelacional = "medio";
  if (aprobado) confianza = "alto";
  else if (pausadoORechazado || args.requiereValidacion || args.riesgo === "alto") confianza = "bajo";
  else if (enMovimiento) confianza = "medio";

  let friccion: NivelRelacional = "bajo";
  if (pausadoORechazado || args.requiereValidacion || (sinAccion && sinFecha)) friccion = "alto";
  else if (args.riesgo === "medio" || sinAccion || sinFecha) friccion = "medio";

  let desgaste: NivelRelacional = "bajo";
  if ((dias >= 10 && !aprobado) || args.riesgo === "alto") desgaste = "alto";
  else if ((dias >= 5 && !aprobado) || args.riesgo === "medio") desgaste = "medio";

  let claridad: NivelClaridad = "media";
  if (aprobado || pausadoORechazado) claridad = "alta";
  else if (sinAccion && sinFecha && !args.tieneCotizacion) claridad = "baja";
  else if (enMovimiento) claridad = "media";

  let conversion: NivelRelacional = "medio";
  if (aprobado) conversion = "alto";
  else if (pausadoORechazado || args.riesgo === "alto") conversion = "bajo";
  else if (estado === "cotizado" || estado === "negociacion" || estado === "en_proceso") conversion = "medio";

  let observacion =
    "Caso en evolución normal con señales mixtas de avance y seguimiento.";

  if (confianza === "alto" && conversion === "alto") {
    observacion =
      "Cliente con señales favorables de avance, baja resistencia y buena probabilidad de conversión.";
  } else if (friccion === "alto" && desgaste === "alto") {
    observacion =
      "Cliente o caso con fricción y desgaste operativo elevados; conviene contener retrabajo y proteger tiempo.";
  } else if (claridad === "baja" && conversion === "bajo") {
    observacion =
      "La intención del caso luce poco clara y la probabilidad de conversión es reducida en este momento.";
  } else if (requiereAtencion(args)) {
    observacion =
      "Caso con señales de cautela: requiere seguimiento estructurado, validación o definición más clara.";
  }

  return {
    confianza,
    friccion,
    desgaste,
    claridad,
    conversion,
    observacion,
  };
}

function requiereAtencion(args: Args) {
  const estado = (args.estadoComercial ?? "").toLowerCase();
  return (
    args.riesgo !== "bajo" ||
    !!args.requiereValidacion ||
    !args.proximaAccion ||
    !args.proximaFecha ||
    estado === "pausado" ||
    estado === "rechazado"
  );
}
