import { derivarPerfilRelacionalCaso } from "@/lib/relacional/perfil";
import { recomendarAccionOperativa } from "@/lib/recomendacion/operativa";
import { calcularEstadoSla } from "@/lib/sla/casos";
import { derivarEstadoComercialReal } from "./estado-comercial";
import { derivarEstadoTecnicoReal } from "./estado-tecnico";
import { derivarMacroareaCaso } from "./macroarea";
import { normalizarClienteRelacionado } from "./normalizar-cliente";
import { derivarProximaAccionReal, derivarProximaFechaReal } from "./proxima-accion";
import { derivarRiesgoCaso } from "./riesgo";
import type { CasoBaseDominio, CasoDerivadosDominio, CasoNormalizado } from "./types";

function textoRelacional(valor: string | null | undefined, fallback: string) {
  const limpio = (valor ?? "").trim();
  return limpio || fallback;
}

export function normalizarCaso(
  caso: CasoBaseDominio,
  derivados: CasoDerivadosDominio = {}
): CasoNormalizado {
  const cliente = normalizarClienteRelacionado(caso.clientes);
  const requiereValidacion = derivados.requiereValidacion ?? false;

  const estado_tecnico_real = derivarEstadoTecnicoReal({
    estadoTecnico: caso.estado_tecnico,
    tieneInforme: derivados.tieneInforme,
    tieneDiagnostico: derivados.tieneDiagnostico,
    tieneCotizacion: derivados.tieneCotizacion,
  });

  const estado_comercial_real = derivarEstadoComercialReal({
    estadoComercial: caso.estado_comercial,
    seguimientoEstadoComercial: derivados.seguimientoEstadoComercial,
    cotizacionEstado: derivados.cotizacionEstado,
    tieneCotizacion: derivados.tieneCotizacion,
    tieneSeguimiento: derivados.tieneSeguimiento,
  });

  const proxima_accion_real = derivarProximaAccionReal({
    proximaAccion: caso.proxima_accion,
    seguimientoProximoPaso: derivados.seguimientoProximoPaso,
    tieneInforme: derivados.tieneInforme,
    tieneDiagnostico: derivados.tieneDiagnostico,
    tieneCotizacion: derivados.tieneCotizacion,
    tieneSeguimiento: derivados.tieneSeguimiento,
  });

  const proxima_fecha_real = derivarProximaFechaReal({
    proximaFecha: caso.proxima_fecha,
    seguimientoProximaFecha: derivados.seguimientoProximaFecha,
  });

  const sla = calcularEstadoSla({
    prioridad: caso.prioridad as "urgente" | "alta" | "media" | "baja" | null,
    createdAt: caso.created_at,
    proximaFecha: proxima_fecha_real,
    proximaAccion: proxima_accion_real,
  });

  const riesgo = derivarRiesgoCaso({
    slaNivel: sla.nivel,
    estadoComercialReal: estado_comercial_real,
  });

  const perfilRelacionalAuto = derivarPerfilRelacionalCaso({
    createdAt: caso.created_at,
    riesgo,
    estadoComercial: estado_comercial_real,
    proximaAccion: proxima_accion_real,
    proximaFecha: proxima_fecha_real,
    requiereValidacion,
    tieneCotizacion: derivados.tieneCotizacion ?? false,
    cotizacionEstado: derivados.cotizacionEstado ?? null,
    tieneSeguimiento: derivados.tieneSeguimiento ?? false,
  });

  const recomendacionOperativa = recomendarAccionOperativa({
    prioridad: caso.prioridad,
    estadoComercial: estado_comercial_real,
    estadoTecnico: estado_tecnico_real,
    proximaAccion: proxima_accion_real,
    proximaFecha: proxima_fecha_real,
    riesgo,
    requiereValidacion,
    tieneInforme: derivados.tieneInforme ?? false,
    tieneDiagnostico: derivados.tieneDiagnostico ?? false,
    tieneCotizacion: derivados.tieneCotizacion ?? false,
    tieneSeguimiento: derivados.tieneSeguimiento ?? false,
  });

  const macroarea = derivarMacroareaCaso({
    estadoTecnicoReal: estado_tecnico_real,
    estadoComercialReal: estado_comercial_real,
    proximaAccionReal: proxima_accion_real,
    proximaFechaReal: proxima_fecha_real,
    requiereValidacion,
  });

  return {
    id: caso.id,
    cliente_id: cliente?.id ?? caso.cliente_id ?? null,
    cliente: cliente?.nombre ?? "Sin cliente",
    empresa: cliente?.empresa ?? "-",
    proyecto: caso.tipo_solicitud || cliente?.empresa || "-",
    prioridad: caso.prioridad,
    estado_tecnico_real,
    estado_comercial_real,
    proxima_accion_real,
    proxima_fecha_real,
    riesgo,
    sla_nivel: sla.nivel,
    sla_etiqueta: sla.etiqueta,
    sla_descripcion: sla.descripcion,
    requiere_validacion: requiereValidacion,
    nivel_confianza_cliente: textoRelacional(
      caso.nivel_confianza_cliente,
      perfilRelacionalAuto.confianza
    ),
    nivel_friccion_cliente: textoRelacional(
      caso.nivel_friccion_cliente,
      perfilRelacionalAuto.friccion
    ),
    desgaste_operativo: textoRelacional(
      caso.desgaste_operativo,
      perfilRelacionalAuto.desgaste
    ),
    claridad_intencion: textoRelacional(
      caso.claridad_intencion,
      perfilRelacionalAuto.claridad
    ),
    probabilidad_conversion: textoRelacional(
      caso.probabilidad_conversion,
      perfilRelacionalAuto.conversion
    ),
    observacion_relacional: textoRelacional(
      caso.observacion_relacional,
      perfilRelacionalAuto.observacion
    ),
    recomendacion_accion: recomendacionOperativa.accion,
    recomendacion_urgencia: recomendacionOperativa.urgencia,
    recomendacion_motivo: recomendacionOperativa.motivo,
    recomendacion_fecha: recomendacionOperativa.fechaSugerida,
    macroarea_actual: macroarea.actual,
    macroarea_siguiente: macroarea.siguiente,
    macroarea_label: macroarea.label,
    macroarea_orden: macroarea.orden,
    macroarea_motivo: macroarea.motivo,
    created_at: caso.created_at,
  };
}
