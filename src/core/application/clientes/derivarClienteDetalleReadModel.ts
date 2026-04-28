import type { GetCasosNormalizadosResult } from "@/core/application/casos";
import { derivarSemanticaCasoOperativo } from "@/core/application/organigrama";
import { construirEventosCaso, type EventoBase } from "@/lib/eventos/casos";
import type { CasosBulkUpdateItem } from "@/core/application/casos";
import type {
  ClienteDetalleAlerta,
  ClienteDetalleIntervencion,
  ClienteDetalleMovimiento,
  ClienteDetalleReadModel,
} from "./contracts";
import type { ClienteDetalleHostInput } from "./adapter/mapClienteDetalleFromHost";

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatearMonto(valor: number | null) {
  if (valor === null) return "-";
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor);
}

function resumirNivel(valores: Array<string | null | undefined>) {
  const conteo = new Map<string, number>();

  for (const valor of valores) {
    const normalizado = (valor ?? "").trim().toLowerCase();
    if (!normalizado) continue;
    conteo.set(normalizado, (conteo.get(normalizado) ?? 0) + 1);
  }

  if (conteo.size === 0) return "-";

  let ganador = "";
  let max = -1;
  for (const [clave, cantidad] of conteo.entries()) {
    if (cantidad > max) {
      ganador = clave;
      max = cantidad;
    }
  }

  return formatearTexto(ganador);
}

function obtenerTimestamp(fecha: string | null | undefined) {
  if (!fecha) return 0;
  const ms = new Date(fecha).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function esActivo(estadoComercial: string) {
  return estadoComercial !== "aprobado" && estadoComercial !== "rechazado";
}

function esVencido(caso: GetCasosNormalizadosResult["items"][number]) {
  if (!caso.proxima_fecha_real) return false;
  if (!esActivo(caso.estado_comercial_real)) return false;
  return caso.proxima_fecha_real.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function derivarLecturaVinculo(args: {
  casos_en_riesgo: number;
  friccion: string;
  activos: number;
}) {
  if (args.casos_en_riesgo > 0 || args.friccion === "Alto") {
    return "Relación con señales de fricción o riesgo que requieren seguimiento cercano.";
  }
  if (args.activos > 0) {
    return "Relación activa con carga operativa en curso y oportunidad de avance comercial.";
  }
  return "Relación estable con baja carga inmediata y espacio para desarrollo comercial.";
}

function derivarPrioridadRelacional(args: {
  en_riesgo: number;
  validaciones: number;
  friccion: string;
  activos: number;
}) {
  if (
    args.en_riesgo > 0 ||
    args.validaciones > 0 ||
    args.friccion === "Alto"
  ) {
    return "Alta";
  }
  if (args.activos > 0 || args.friccion === "Medio") {
    return "Media";
  }
  return "Baja";
}

function construirAlertas(
  casos: GetCasosNormalizadosResult["items"]
): ClienteDetalleAlerta[] {
  const alertas = new Map<string, ClienteDetalleAlerta>();

  for (const caso of casos) {
    if (caso.riesgo === "alto") {
      alertas.set(`riesgo_${caso.id}`, {
        codigo: `riesgo_alto_${caso.id}`,
        label: `Caso ${caso.id.slice(0, 8)} en riesgo alto`,
        severidad: "critical",
      });
    }
    if (caso.validacion_pendiente ?? caso.requiere_validacion) {
      alertas.set(`validacion_${caso.id}`, {
        codigo: `validacion_${caso.id}`,
        label: `Caso ${caso.id.slice(0, 8)} requiere validación`,
        severidad: "warning",
      });
    }
    if (
      !caso.proxima_fecha_real ||
      !caso.proxima_accion_real ||
      caso.proxima_accion_real === "Sin próxima acción"
    ) {
      alertas.set(`continuidad_${caso.id}`, {
        codigo: `continuidad_${caso.id}`,
        label: `Caso ${caso.id.slice(0, 8)} con continuidad por definir`,
        severidad: caso.riesgo === "alto" ? "critical" : "warning",
      });
    }
  }

  return Array.from(alertas.values()).slice(0, 12);
}

function construirActividad(
  clienteId: string,
  casos: GetCasosNormalizadosResult["items"],
  alertas: ClienteDetalleAlerta[]
): EventoBase[] {
  return casos
    .flatMap((caso) =>
      construirEventosCaso({
        caso: {
          id: caso.id,
          created_at: caso.created_at,
          clientes: { id: clienteId },
        },
        alertas: alertas
          .filter((alerta) => alerta.codigo.endsWith(caso.id))
          .map((alerta) => ({
            titulo: alerta.label,
            detalle: caso.proxima_accion_real || "Atención táctica requerida.",
            fecha: caso.proxima_fecha_real ?? caso.created_at,
            nivel: alerta.severidad,
          })),
      })
    )
    .sort((a, b) => obtenerTimestamp(b.fecha) - obtenerTimestamp(a.fecha))
    .slice(0, 10);
}

function construirMovimientos(
  host: ClienteDetalleHostInput
): ClienteDetalleMovimiento[] {
  return [
    ...host.seguimientos.map((seg) => ({
      id: `seg-${seg.id}`,
      caso_id: seg.caso_id,
      tipo: "Seguimiento" as const,
      detalle: seg.resultado || "Seguimiento registrado",
      fecha: seg.fecha ?? seg.created_at,
    })),
    ...host.cotizaciones.map((cot) => ({
      id: `cot-${cot.id}`,
      caso_id: cot.caso_id,
      tipo: "Cotización" as const,
      detalle: `${formatearTexto(cot.estado ?? "sin_estado")} · ${formatearMonto(cot.monto)}`,
      fecha: cot.created_at,
    })),
  ]
    .sort((a, b) => obtenerTimestamp(b.fecha) - obtenerTimestamp(a.fecha))
    .slice(0, 8);
}

function construirIntervenciones(
  casos: GetCasosNormalizadosResult["items"]
): ClienteDetalleIntervencion[] {
  const agrupadas = new Map<string, ClienteDetalleIntervencion>();

  for (const caso of casos) {
    const key = `${caso.recomendacion_accion}__${caso.recomendacion_urgencia}`;
    const actual = agrupadas.get(key);
    if (actual) {
      actual.total += 1;
      actual.casos.push(caso.id);
      if (!actual.fecha && caso.recomendacion_fecha) {
        actual.fecha = caso.recomendacion_fecha;
      }
      continue;
    }

    agrupadas.set(key, {
      accion: caso.recomendacion_accion,
      urgencia: caso.recomendacion_urgencia,
      total: 1,
      casos: [caso.id],
      motivo: caso.recomendacion_motivo,
      fecha: caso.recomendacion_fecha,
    });
  }

  const pesoUrgencia = { alta: 3, media: 2, baja: 1 };
  return Array.from(agrupadas.values())
    .sort((a, b) => {
      const urgenciaDiff = pesoUrgencia[b.urgencia] - pesoUrgencia[a.urgencia];
      if (urgenciaDiff !== 0) return urgenciaDiff;
      return b.total - a.total;
    })
    .slice(0, 6);
}

function construirBulkItems(
  clienteNombre: string,
  clienteEmpresa: string | null,
  casos: GetCasosNormalizadosResult["items"]
): CasosBulkUpdateItem[] {
  return casos.map((caso) => ({
    id: caso.id,
    cliente: clienteNombre,
    proyecto: clienteEmpresa ?? "-",
    riesgo: caso.riesgo,
    estado_comercial_real: caso.estado_comercial_real,
    proxima_fecha_real: caso.proxima_fecha_real,
    recomendacion_accion: caso.recomendacion_accion,
    recomendacion_urgencia: caso.recomendacion_urgencia,
    recomendacion_fecha: caso.recomendacion_fecha,
  }));
}

export function derivarClienteDetalleReadModel(args: {
  host: ClienteDetalleHostInput;
  casos: GetCasosNormalizadosResult["items"];
}): ClienteDetalleReadModel {
  const casosOrdenados = [...args.casos].sort((a, b) => {
    const peso = { alto: 3, medio: 2, bajo: 1 };
    const diffRiesgo = peso[b.riesgo] - peso[a.riesgo];
    if (diffRiesgo !== 0) return diffRiesgo;
    return obtenerTimestamp(a.proxima_fecha_real) - obtenerTimestamp(b.proxima_fecha_real);
  });

  const totalCasos = casosOrdenados.length;
  const activos = casosOrdenados.filter((caso) => esActivo(caso.estado_comercial_real)).length;
  const enRiesgo = casosOrdenados.filter((caso) => caso.riesgo === "alto").length;
  const conProximaFecha = casosOrdenados.filter((caso) => !!caso.proxima_fecha_real).length;
  const validacionesPendientes = casosOrdenados.filter(
    (caso) => caso.validacion_pendiente ?? caso.requiere_validacion
  ).length;
  const vencidosSla = casosOrdenados.filter((caso) => esVencido(caso)).length;

  const confianza = resumirNivel(casosOrdenados.map((caso) => caso.nivel_confianza_cliente));
  const friccion = resumirNivel(casosOrdenados.map((caso) => caso.nivel_friccion_cliente));
  const desgaste = resumirNivel(casosOrdenados.map((caso) => caso.desgaste_operativo));
  const claridad = resumirNivel(casosOrdenados.map((caso) => caso.claridad_intencion));
  const conversion = resumirNivel(casosOrdenados.map((caso) => caso.probabilidad_conversion));
  const observacion =
    casosOrdenados.find((caso) => caso.observacion_relacional && caso.observacion_relacional !== "-")
      ?.observacion_relacional ||
    derivarLecturaVinculo({
      casos_en_riesgo: enRiesgo,
      friccion,
      activos,
    });

  const alertas = construirAlertas(casosOrdenados);
  const movimientos = construirMovimientos(args.host);

  return {
    cliente: {
      id: args.host.cliente.id,
      nombre: args.host.cliente.nombre,
      empresa: args.host.cliente.empresa,
      segmento: null,
    },
    resumen: {
      total_casos: totalCasos,
      activos,
      en_riesgo: enRiesgo,
      con_proxima_fecha: conProximaFecha,
      validaciones_pendientes: validacionesPendientes,
      vencidos_sla: vencidosSla,
      ultimo_movimiento: movimientos[0]?.fecha ?? casosOrdenados[0]?.created_at ?? null,
    },
    estado_relacional: {
      confianza,
      friccion,
      desgaste,
      claridad,
      conversion,
      observacion,
      prioridad_relacional: derivarPrioridadRelacional({
        en_riesgo: enRiesgo,
        validaciones: validacionesPendientes,
        friccion,
        activos,
      }),
      lectura_vinculo: derivarLecturaVinculo({
        casos_en_riesgo: enRiesgo,
        friccion,
        activos,
      }),
    },
    casos: casosOrdenados.map((caso) => ({
      id: caso.id,
      titulo: caso.proyecto || null,
      prioridad: caso.prioridad,
      estado: caso.estado,
      estado_label: caso.estado_label,
      estado_comercial: caso.estado_comercial_real,
      macroarea_actual: caso.macroarea_actual,
      macroarea_label: caso.macroarea_label,
      riesgo: caso.riesgo,
      sla: caso.sla,
      proxima_accion: caso.proxima_accion_real,
      proxima_fecha: caso.proxima_fecha_real,
      recomendacion_accion: caso.recomendacion_accion,
      recomendacion_urgencia: caso.recomendacion_urgencia,
      recomendacion_motivo: caso.recomendacion_motivo,
      recomendacion_fecha: caso.recomendacion_fecha,
      requiere_validacion: caso.requiere_validacion,
      ownership_operativo: caso.macroarea_label,
      semantica_operativa: derivarSemanticaCasoOperativo(caso),
    })),
    actividad: construirActividad(args.host.cliente.id, casosOrdenados, alertas),
    movimientos,
    alertas,
    intervenciones: construirIntervenciones(casosOrdenados),
    bulk_items: construirBulkItems(
      args.host.cliente.nombre,
      args.host.cliente.empresa,
      casosOrdenados
    ),
    metadata: {
      origen: "core.application.clientes.detalle",
      timestamp: new Date().toISOString(),
    },
  };
}
