import Link from "next/link";
import { resolverSiguienteAccionOperativa } from "@/core/application/casos/flujo-operativo";
import { getEventosAgenteIAPorCaso } from "@/core/application/agentes-ia";
import { getCasoDetalleNormalizadoById } from "@/core/application/casos/useCases/getCasoDetalleNormalizadoById";
import type { CasoDetalleNormalizado } from "@/core/domain/casos/detalle";
import { inicialesResponsableOperativo } from "@/core/domain/casos/responsabilidad-operativa";
import type { EtapaCaso, EtapaEstado } from "@/core/domain/casos/workflow";
import HistorialAgenteIA from "@/components/casos/historial-agente-ia";
import { formatearFecha, formatearFechaCorta } from "@/lib/fecha";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type PillTone = "amber" | "red" | "blue" | "purple" | "green" | "slate" | "cyan";
type EtapaRealOpenCore = EtapaCaso | "validacion";
type EstadoEtapaReal = EtapaEstado["estado"];
type PasoVisual = {
  label: "Recepción" | "Análisis" | "Revisión" | "Aprobación" | "Cierre";
  numero: number;
  estado: "completado" | "actual" | "pendiente";
  fecha: string;
  etapasReales: EtapaRealOpenCore[];
};
type TareaPendiente = {
  titulo: string;
  fecha: string | null;
  prioridad: "Alta" | "Media";
};

const FLUJO_REAL_COMPLETO: EtapaRealOpenCore[] = [
  "solicitud",
  "recoleccion",
  "levantamiento",
  "informe",
  "diagnostico",
  "validacion",
  "cotizacion",
  "gestion_comercial",
  "logistica_entrega",
  "auditoria",
  "postventa",
  "cierre_tecnico",
  "cerrado",
];

const ETAPAS_UI_ACTUALES: Array<{
  label: PasoVisual["label"];
  etapas: EtapaRealOpenCore[];
}> = [
  { label: "Recepción", etapas: ["solicitud", "recoleccion"] },
  { label: "Análisis", etapas: ["levantamiento", "informe", "diagnostico"] },
  { label: "Revisión", etapas: ["validacion"] },
  { label: "Aprobación", etapas: ["cotizacion", "gestion_comercial"] },
  {
    label: "Cierre",
    etapas: ["logistica_entrega", "auditoria", "postventa", "cierre_tecnico", "cerrado"],
  },
];

function formatearTexto(valor: string | null | undefined) {
  if (!valor) return "-";

  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function displayCasoId(id: string) {
  const match = id.match(/20\d{2}[-_]\d{2,}/);
  if (match) return `#${match[0].replace("_", "-")}`;
  return `#${id.slice(0, 8)}`;
}

function estadoUi(estado: string) {
  if (estado === "aprobado") return "Aprobado";
  if (estado === "rechazado" || estado === "pausado" || estado === "cerrado") return "Cerrado";
  if (estado === "validacion") return "En revisión";
  if (estado === "solicitud") return "Abierto";
  return "En progreso";
}

function estadoTone(estado: string): PillTone {
  if (estado === "validacion") return "purple";
  if (estado === "aprobado") return "green";
  if (estado === "rechazado" || estado === "pausado" || estado === "cerrado") return "slate";
  return "amber";
}

function prioridadUi(prioridad: string | null | undefined) {
  if (prioridad === "urgente") return "Alta prioridad";
  if (prioridad === "alta") return "Alta prioridad";
  if (prioridad === "media") return "Media prioridad";
  if (prioridad === "baja") return "Baja prioridad";
  return "Sin prioridad";
}

function prioridadTone(prioridad: string | null | undefined): PillTone {
  if (prioridad === "urgente" || prioridad === "alta") return "red";
  if (prioridad === "media") return "amber";
  if (prioridad === "baja") return "blue";
  return "slate";
}

function pillClass(tone: PillTone) {
  const tones: Record<PillTone, string> = {
    amber: "bg-[#fff4dc] text-[#b77700]",
    red: "bg-[#fdecec] text-[#de3b3b]",
    blue: "bg-[#e9f1ff] text-[#2563eb]",
    purple: "bg-[#f0eaff] text-[#6f4bd8]",
    green: "bg-[#eaf7ee] text-[#2f8a4f]",
    slate: "bg-[#edf0f4] text-[#6d7683]",
    cyan: "bg-[#e8fbff] text-[#0a8794]",
  };

  return tones[tone];
}

function tipoCaso(tipo: string | null | undefined, macroarea: string | null | undefined) {
  if (tipo) return formatearTexto(tipo);
  if (macroarea === "comercial") return "Contrato";
  if (macroarea === "administracion") return "Administrativo";
  if (macroarea === "tecnico") return "Reclamo";
  return "Legal";
}

function diferenciaDias(fechaIso: string | null | undefined) {
  if (!fechaIso) return null;

  const fecha = new Date(fechaIso);
  if (Number.isNaN(fecha.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);

  return Math.ceil((fecha.getTime() - hoy.getTime()) / 86400000);
}

function textoDiferenciaDias(fechaIso: string | null | undefined) {
  const dias = diferenciaDias(fechaIso);
  if (dias === null) return "-";
  if (dias === 0) return "Hoy";
  if (dias === 1) return "Mañana";
  if (dias > 1) return `En ${dias} días`;
  if (dias === -1) return "Ayer";
  return `Vencido hace ${Math.abs(dias)} días`;
}

function fechaCreacionRelativa(fechaIso: string | null | undefined) {
  const dias = diferenciaDias(fechaIso);
  if (dias === null) return "-";
  const pasado = Math.abs(dias);
  if (pasado === 0) return "Hoy";
  if (pasado === 1) return "Ayer";
  return `Hace ${pasado} días`;
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Icon({ type }: { type: "client" | "person" | "calendar" | "file" | "activity" | "note" | "plus" }) {
  const common = {
    className: "h-4 w-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "client") {
    return (
      <svg {...common}>
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-6h6v6" />
        <path d="M8 10h.01M12 10h.01M16 10h.01" />
      </svg>
    );
  }

  if (type === "person") {
    return (
      <svg {...common}>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    );
  }

  if (type === "calendar") {
    return (
      <svg {...common}>
        <path d="M7 3v4M17 3v4" />
        <path d="M4 8h16v12H4z" />
      </svg>
    );
  }

  if (type === "activity") {
    return (
      <svg {...common}>
        <path d="M4 12h4l2-5 4 10 2-5h4" />
      </svg>
    );
  }

  if (type === "note") {
    return (
      <svg {...common}>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }

  if (type === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M7 3.8h6.4L18 8.4v11.8H7z" />
      <path d="M13.4 3.8v4.6H18" />
      <path d="M9.8 12h4.4M9.8 15.5h5.6" />
    </svg>
  );
}

function normalizarEtapaReal(
  etapa: EtapaRealOpenCore,
  detalle: CasoDetalleNormalizado
): {
  etapa: EtapaRealOpenCore;
  label: string;
  estado: EstadoEtapaReal;
  fecha_referencia: string | null;
  motivo: string;
} {
  const hitoRecoleccion = detalle.estadoGlobal.workflow.hitos.find(
    (hito) => hito.codigo === "informacion_minima_completa"
  );
  const hitoLevantamiento = detalle.estadoGlobal.workflow.hitos.find(
    (hito) => hito.codigo === "levantamiento_realizado"
  );

  if (etapa === "recoleccion") {
    return {
      etapa,
      label: "Recolección de información",
      estado: hitoRecoleccion?.ocurrio ? "completada" : "pendiente",
      fecha_referencia: hitoRecoleccion?.fecha ?? null,
      motivo:
        hitoRecoleccion?.observacion ??
        "La recolección se deriva del hito de información mínima del workflow.",
    };
  }

  if (etapa === "levantamiento") {
    return {
      etapa,
      label: "Levantamiento",
      estado: hitoLevantamiento?.ocurrio ? "completada" : "pendiente",
      fecha_referencia: hitoLevantamiento?.fecha ?? null,
      motivo:
        hitoLevantamiento?.observacion ??
        "El levantamiento se deriva del hito formal del workflow cuando exista soporte operativo.",
    };
  }

  if (etapa !== "validacion") {
    const etapaWorkflow = detalle.estadoGlobal.workflow.etapas.find(
      (item) => item.etapa === etapa
    );

    if (etapaWorkflow) {
      return etapaWorkflow;
    }

    return {
      etapa,
      label: formatearTexto(etapa),
      estado: "pendiente",
      fecha_referencia: null,
      motivo: "Etapa real del flujo OpenCore sin registro formal todavía.",
    };
  }

  const diagnostico = detalle.estadoGlobal.workflow.etapas.find(
    (item) => item.etapa === "diagnostico"
  );
  const metadata = detalle.estadoGlobal.metadata;
  const resultado = metadata.resultado_validacion;
  const requiereValidacion = metadata.requiere_validacion;
  const pendiente =
    metadata.validacion_pendiente ??
    (requiereValidacion && metadata.validacion_resuelta !== true);
  const diagnosticoDisponible =
    diagnostico?.estado === "completada" ||
    diagnostico?.estado === "actual" ||
    detalle.expediente.diagnostico_humano.estado === "completo";

  let estado: EstadoEtapaReal = "pendiente";

  if (pendiente || detalle.estadoGlobal.estado === "validacion") {
    estado = "actual";
  } else if (
    metadata.validacion_resuelta === true ||
    resultado === "validado" ||
    (!requiereValidacion && diagnosticoDisponible)
  ) {
    estado = "completada";
  } else if (diagnosticoDisponible && requiereValidacion) {
    estado = "actual";
  }

  return {
    etapa: "validacion",
    label: "Validación",
    estado,
    fecha_referencia: metadata.fecha_validacion ?? diagnostico?.fecha_referencia ?? null,
    motivo: pendiente
      ? "El diagnóstico requiere validación antes de continuar el avance operativo."
      : "La validación técnica se deriva del diagnóstico y sus resultados formales.",
  };
}

function construirEtapasReales(detalle: CasoDetalleNormalizado) {
  return FLUJO_REAL_COMPLETO.map((etapa) => normalizarEtapaReal(etapa, detalle));
}

function resolverEtapaActualReal(
  detalle: CasoDetalleNormalizado,
  etapasReales: ReturnType<typeof construirEtapasReales>
): EtapaRealOpenCore {
  const validacion = etapasReales.find((item) => item.etapa === "validacion");

  if (
    validacion?.estado === "actual" ||
    detalle.estadoGlobal.estado === "validacion" ||
    detalle.estadoGlobal.metadata.validacion_pendiente === true
  ) {
    return "validacion";
  }

  const actualPorWorkflow = etapasReales.find(
    (item) => item.etapa === detalle.estadoGlobal.workflow.etapa_actual
  );

  if (actualPorWorkflow) {
    return actualPorWorkflow.etapa;
  }

  return etapasReales.find((item) => item.estado === "actual")?.etapa ?? "solicitud";
}

function fechaMasReciente(fechas: Array<string | null>) {
  return fechas
    .filter((fecha): fecha is string => Boolean(fecha))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
}

function derivarProgresoVisual(detalle: CasoDetalleNormalizado): {
  pasos: PasoVisual[];
  progreso: number;
  etapaActualReal: EtapaRealOpenCore;
  inconsistencias: string[];
} {
  const etapasReales = construirEtapasReales(detalle);
  const etapaActualReal = resolverEtapaActualReal(detalle, etapasReales);
  const etapasMap = new Map(etapasReales.map((item) => [item.etapa, item]));
  const total = FLUJO_REAL_COMPLETO.length;
  const completadas = etapasReales.filter((item) => item.estado === "completada").length;
  const progreso = Math.round((completadas / total) * 100);
  const inconsistencias = [
    ...detalle.estadoGlobal.workflow.alineacion.alertas,
    detalle.estadoGlobal.alineacion_operativa.warning?.message ?? null,
    ...etapasReales
      .filter((item) => item.estado === "bloqueada")
      .map((item) => `${item.label}: ${item.motivo}`),
  ].filter((item): item is string => Boolean(item));

  return {
    progreso,
    etapaActualReal,
    inconsistencias,
    pasos: ETAPAS_UI_ACTUALES.map((grupo, index) => {
      const etapasDelGrupo = grupo.etapas.map((etapa) => etapasMap.get(etapa));
      const contieneActual = grupo.etapas.includes(etapaActualReal);
      const todasCompletadas = etapasDelGrupo.every(
        (etapa) => etapa?.estado === "completada"
      );
      const estado: PasoVisual["estado"] = contieneActual
        ? "actual"
        : todasCompletadas
          ? "completado"
          : "pendiente";
      const fechaReferencia =
        contieneActual
          ? etapasMap.get(etapaActualReal)?.fecha_referencia ??
            detalle.estadoGlobal.proxima_fecha
          : fechaMasReciente(etapasDelGrupo.map((etapa) => etapa?.fecha_referencia ?? null));

      return {
        label: grupo.label,
        numero: index + 1,
        estado,
        fecha: fechaReferencia ? formatearFechaCorta(fechaReferencia) : "Pendiente",
        etapasReales: grupo.etapas,
      };
    }),
  };
}

function fechaTarea(detalle: CasoDetalleNormalizado, fallback?: string | null) {
  return (
    fallback ??
    detalle.estadoGlobal.recomendacion_operativa.fecha_sugerida ??
    detalle.estadoGlobal.proxima_fecha ??
    null
  );
}

function tareaPrincipalPorEtapa(
  detalle: CasoDetalleNormalizado,
  etapa: EtapaRealOpenCore
): TareaPendiente {
  switch (etapa) {
    case "solicitud":
    case "recoleccion":
      return {
        titulo: "Completar información inicial del caso",
        fecha: fechaTarea(detalle),
        prioridad: "Media",
      };
    case "levantamiento":
      return {
        titulo: "Registrar levantamiento operativo",
        fecha: fechaTarea(detalle),
        prioridad: "Media",
      };
    case "informe":
      return {
        titulo: "Registrar informe técnico",
        fecha: fechaTarea(detalle),
        prioridad: "Alta",
      };
    case "diagnostico":
      return {
        titulo: "Completar diagnóstico técnico",
        fecha: fechaTarea(detalle),
        prioridad: "Alta",
      };
    case "validacion":
      return {
        titulo: "Validar diagnóstico humano",
        fecha: fechaTarea(detalle),
        prioridad: "Alta",
      };
    case "cotizacion":
      return {
        titulo: "Emitir cotización",
        fecha: fechaTarea(detalle),
        prioridad: "Alta",
      };
    case "gestion_comercial":
      return {
        titulo: "Dar seguimiento a cotización",
        fecha: fechaTarea(detalle),
        prioridad: "Media",
      };
    case "logistica_entrega":
      return {
        titulo: "Coordinar entrega",
        fecha: fechaTarea(detalle, detalle.estadoGlobal.workflow.logistica?.fecha_programada),
        prioridad: "Media",
      };
    case "auditoria":
      return {
        titulo: "Registrar auditoría posterior a entrega",
        fecha: fechaTarea(detalle, detalle.estadoGlobal.workflow.auditoria?.fecha_auditoria),
        prioridad: "Media",
      };
    case "postventa":
      return {
        titulo:
          detalle.estadoGlobal.workflow.postventa?.proxima_accion ??
          "Resolver seguimiento postventa",
        fecha: fechaTarea(detalle, detalle.estadoGlobal.workflow.postventa?.proxima_fecha),
        prioridad: detalle.estadoGlobal.workflow.postventa?.requiere_accion ? "Alta" : "Media",
      };
    case "cierre_tecnico":
      return {
        titulo: "Registrar cierre técnico",
        fecha: fechaTarea(detalle, detalle.estadoGlobal.workflow.cierre_tecnico?.fecha_cierre_tecnico),
        prioridad: "Media",
      };
    case "cerrado":
      return {
        titulo: "Confirmar expediente cerrado",
        fecha: fechaTarea(detalle),
        prioridad: "Media",
      };
  }
}

function derivarTareasPendientes(
  detalle: CasoDetalleNormalizado,
  etapaActualReal: EtapaRealOpenCore,
  inconsistencias: string[]
): TareaPendiente[] {
  const tareas: TareaPendiente[] = [];

  if (inconsistencias.length > 0) {
    tareas.push({
      titulo: `Resolver inconsistencia: ${inconsistencias[0]}`,
      fecha: fechaTarea(detalle),
      prioridad: "Alta",
    });
  }

  tareas.push(tareaPrincipalPorEtapa(detalle, etapaActualReal));

  if (
    detalle.estadoGlobal.workflow.continuidad.estado === "vencida" ||
    detalle.estadoGlobal.workflow.continuidad.estado === "bloqueada" ||
    detalle.estadoGlobal.workflow.alineacion.continuidad_vs_workflow !== "alineada"
  ) {
    tareas.push({
      titulo:
        detalle.estadoGlobal.workflow.continuidad.estado === "vencida"
          ? "Actualizar continuidad vencida del caso"
          : "Alinear continuidad con workflow",
      fecha: detalle.estadoGlobal.workflow.continuidad.proxima_fecha,
      prioridad: "Alta",
    });
  }

  const bloqueo = detalle.estadoGlobal.workflow.transiciones.actual?.bloqueos[0];

  if (bloqueo) {
    tareas.push({
      titulo: `Resolver bloqueo de transición: ${bloqueo}`,
      fecha: fechaTarea(detalle),
      prioridad: "Alta",
    });
  }

  return tareas
    .filter(
      (tarea, index, lista) =>
        lista.findIndex((item) => item.titulo === tarea.titulo) === index
    )
    .slice(0, 3);
}

function renderErrorState() {
  return (
    <main className="px-5 py-7 xl:px-8">
      <section className="rounded-lg border border-[#e6e9ef] bg-white p-8">
        <p className="text-sm font-semibold text-[#536174]">Caso operativo</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#111827]">
          No se pudo cargar el detalle del caso
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[#6b7688]">
          La vista integral quedó bloqueada antes de construir continuidad, expediente y
          trazabilidad.
        </p>
        <Link
          href="/casos"
          className="mt-5 inline-flex h-11 items-center rounded-lg border border-[#e6e9ef] px-4 text-sm font-medium text-[#242b37]"
        >
          Volver a casos
        </Link>
      </section>
    </main>
  );
}

export default async function CasoDetallePage({ params }: Props) {
  const { id } = await params;
  let detalle;
  let historialAgenteIA = null;
  let historialAgenteIAError: string | null = null;

  try {
    detalle = await getCasoDetalleNormalizadoById(id);
  } catch {
    return renderErrorState();
  }

  if (!detalle) {
    return renderErrorState();
  }

  try {
    historialAgenteIA = await getEventosAgenteIAPorCaso(id, { limit: 12 });
  } catch (error) {
    historialAgenteIAError =
      error instanceof Error ? error.message : "Error inesperado al cargar historial IA";
  }

  const displayId = displayCasoId(detalle.resumen.id);
  const estado = estadoUi(detalle.estadoGlobal.estado);
  const prioridad = prioridadUi(detalle.estadoGlobal.metadata.prioridad);
  const responsable = {
    iniciales: inicialesResponsableOperativo(detalle.ownership.responsable_humano_label),
    nombre: detalle.ownership.responsable_humano_label,
  };
  const agenteActivo = {
    iniciales: inicialesResponsableOperativo(detalle.ownership.agente_operativo_activo),
    nombre: detalle.ownership.agente_operativo_activo,
  };
  const clienteHref = detalle.resumen.cliente_id
    ? `/clientes/${detalle.resumen.cliente_id}`
    : null;
  const tipo = tipoCaso(detalle.resumen.tipo_solicitud, detalle.estadoGlobal.macroarea_actual);
  const tituloCaso =
    detalle.resumen.cliente_contexto ||
    detalle.estadoGlobal.metadata.empresa ||
    detalle.resumen.descripcion_inicial ||
    "Detalle del caso";
  const fechaCreacion = detalle.estadoGlobal.metadata.created_at;
  const fechaLimite = detalle.estadoGlobal.proxima_fecha;
  const progresoVisual = derivarProgresoVisual(detalle);
  const etiquetas = [
    tipo,
    detalle.estadoGlobal.macroarea_actual_label,
    formatearTexto(detalle.estadoGlobal.metadata.estado_comercial_real),
  ].filter((item) => item && item !== "-");
  const tareas = derivarTareasPendientes(
    detalle,
    progresoVisual.etapaActualReal,
    progresoVisual.inconsistencias
  );
  const siguienteAccion = resolverSiguienteAccionOperativa(
    detalle,
    progresoVisual.etapaActualReal,
    progresoVisual.inconsistencias
  );
  const documentos = [
    ...detalle.expediente.evidencia.data.map((item) => ({
      nombre: item.nombre_archivo ?? item.archivo_path.split("/").at(-1) ?? "Evidencia adjunta",
      fecha: item.created_at,
      tone: "blue" as PillTone,
    })),
    detalle.expediente.informe.data
      ? {
          nombre: "Informe_tecnico.pdf",
          fecha: detalle.expediente.informe.data.created_at,
          tone: "red" as PillTone,
        }
      : null,
    detalle.expediente.cotizacion.data
      ? {
          nombre: "Cotizacion_comercial.pdf",
          fecha: detalle.expediente.cotizacion.data.created_at,
          tone: "purple" as PillTone,
        }
      : null,
  ].filter((item): item is { nombre: string; fecha: string | null; tone: PillTone } => Boolean(item));
  const documentosVisibles =
    documentos.length > 0
      ? documentos.slice(0, 3)
      : [
          { nombre: "Contrato_borrador_v2.pdf", fecha: fechaCreacion, tone: "red" as PillTone },
          { nombre: "Anexo_clausulas.pdf", fecha: fechaCreacion, tone: "purple" as PillTone },
          { nombre: "Términos_y_condiciones.docx", fecha: fechaCreacion, tone: "blue" as PillTone },
        ];
  const actividad = detalle.trazabilidad.timeline.slice(0, 3);
  const notas = [
    detalle.trazabilidad.sintesis.alerta_dominante,
    detalle.relacional.lectura_aplicada,
  ].filter(Boolean);
  const progreso = progresoVisual.progreso;
  const pasos = progresoVisual.pasos;

  return (
    <main className="px-5 py-5 xl:px-8">
      <div className="grid gap-9 xl:grid-cols-[minmax(0,1fr)_368px]">
        <div className="space-y-4">
          <section className="rounded-lg border border-[#e6e9ef] bg-white">
            <div className="px-6 py-7">
              <p className="text-[14px] font-semibold text-[#111827]">{displayId}</p>
              <h1 className="mt-5 text-[27px] font-bold leading-tight text-[#111827]">
                {tituloCaso}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${pillClass(estadoTone(detalle.estadoGlobal.estado))}`}>
                  {estado}
                </span>
                <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${pillClass(prioridadTone(detalle.estadoGlobal.metadata.prioridad))}`}>
                  {prioridad}
                </span>
                <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium ${pillClass("blue")}`}>
                  {tipo}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1 border-b border-[#e6e9ef] px-5">
              {[
                { label: "Resumen", icon: "file" as const, active: true, count: null, href: `/casos/${detalle.resumen.id}` },
                { label: "Tareas", icon: "calendar" as const, active: false, count: tareas.length, href: "#tareas" },
                { label: "Documentos", icon: "file" as const, active: false, count: documentosVisibles.length, href: "#documentos" },
                { label: "Actividades", icon: "activity" as const, active: false, count: null, href: "#actividad" },
                { label: "Notas", icon: "note" as const, active: false, count: null, href: "#notas" },
              ].map((tab) => (
                <a
                  key={tab.label}
                  href={tab.href}
                  className={[
                    "inline-flex h-[52px] items-center gap-2 border-b-2 px-3 text-[14px] font-medium",
                    tab.active
                      ? "border-[#2563eb] text-[#2563eb]"
                      : "border-transparent text-[#536174] hover:text-[#111827]",
                  ].join(" ")}
                >
                  <Icon type={tab.icon} />
                  {tab.label}
                  {tab.count ? (
                    <span className="rounded-full bg-[#edf0f4] px-2 py-0.5 text-[12px] text-[#6b7688]">
                      {tab.count}
                    </span>
                  ) : null}
                </a>
              ))}
            </div>

            <div className="grid gap-6 px-6 py-7 md:grid-cols-4">
              <div>
                <p className="text-[13px] font-semibold text-[#536174]">Cliente</p>
                <div className="mt-4 flex items-start gap-3">
                  <span className="mt-0.5 text-[#6b7688]"><Icon type="client" /></span>
                  <div>
                    {clienteHref ? (
                      <Link href={clienteHref} className="text-[14px] font-semibold text-[#2563eb]">
                        {detalle.resumen.cliente_nombre ?? "Sin cliente"}
                      </Link>
                    ) : (
                      <p className="text-[14px] font-semibold text-[#2563eb]">
                        {detalle.resumen.cliente_nombre ?? "Sin cliente"}
                      </p>
                    )}
                    <p className="mt-1 text-[12.5px] text-[#6b7688]">
                      {detalle.resumen.cliente_contexto || detalle.estadoGlobal.metadata.empresa || "Sin contexto"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#536174]">Responsable humano</p>
                <div className="mt-4 flex items-start gap-3">
                  <span className="mt-0.5 text-[#6b7688]"><Icon type="person" /></span>
                  <div>
                    <p className="text-[14px] font-medium text-[#242b37]">{responsable.nombre}</p>
                    <p className="mt-1 text-[12.5px] text-[#6b7688]">
                      {detalle.estadoGlobal.macroarea_actual_label} · {agenteActivo.nombre}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#536174]">Fecha de creación</p>
                <div className="mt-4 flex items-start gap-3">
                  <span className="mt-0.5 text-[#6b7688]"><Icon type="calendar" /></span>
                  <div>
                    <p className="text-[14px] font-medium text-[#242b37]">{formatearFechaCorta(fechaCreacion)}</p>
                    <p className="mt-1 text-[12.5px] text-[#6b7688]">{fechaCreacionRelativa(fechaCreacion)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-[#536174]">Fecha límite</p>
                <div className="mt-4 flex items-start gap-3">
                  <span className="mt-0.5 text-[#6b7688]"><Icon type="calendar" /></span>
                  <div>
                    <p className="text-[14px] font-medium text-[#242b37]">{formatearFechaCorta(fechaLimite)}</p>
                    <p className="mt-1 text-[12.5px] font-medium text-[#de3b3b]">{textoDiferenciaDias(fechaLimite)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e6e9ef] px-6 py-5">
              <p className="text-[13px] font-semibold text-[#536174]">Descripción</p>
              <p className="mt-2 text-[14px] leading-6 text-[#242b37]">
                {detalle.resumen.descripcion_inicial ||
                  detalle.estadoGlobal.recomendacion_operativa.motivo ||
                  "Seguimiento integral del caso para validar condiciones, documentación, continuidad y cierre operativo."}
              </p>

              <p className="mt-5 text-[13px] font-semibold text-[#536174]">Etiquetas</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {etiquetas.slice(0, 3).map((tag, index) => (
                  <span
                    key={`${tag}-${index}`}
                    className={`rounded-full px-3 py-1 text-[12.5px] font-medium ${pillClass(index === 0 ? "blue" : index === 1 ? "purple" : "cyan")}`}
                  >
                    {tag}
                  </span>
                ))}
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#edf0f4] text-[#536174]">
                  <Icon type="plus" />
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e6e9ef] bg-white px-6 py-5">
            <h2 className="text-[16px] font-semibold text-[#111827]">Progreso del caso</h2>
            <div className="mt-6 grid grid-cols-5 gap-3">
              {pasos.map((paso) => (
                <div key={paso.label} className="text-center">
                  <div
                    className={[
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-[14px] font-semibold",
                      paso.estado === "completado"
                        ? "border-[#45ad64] bg-[#45ad64] text-white"
                        : paso.estado === "actual"
                          ? "border-[#2563eb] bg-[#2563eb] text-white"
                          : "border-[#d8dee8] bg-[#f4f6f9] text-[#6b7688]",
                    ].join(" ")}
                  >
                    {paso.estado === "completado" ? <CheckIcon /> : paso.numero}
                  </div>
                  <p className="mt-3 text-[13.5px] font-medium text-[#536174]">{paso.label}</p>
                  <p className="mt-2 text-[12.5px] text-[#6b7688]">{paso.fecha}</p>
                  <p className="mt-1 text-[12.5px] text-[#536174]">
                    {paso.estado === "completado" ? "Completado" : paso.estado === "actual" ? "En curso" : "Pendiente"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#e7ebf2]">
              <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${progreso}%` }} />
            </div>
            <p className="mt-3 text-[14px] font-medium text-[#2563eb]">{progreso}% completado</p>
          </section>

          <section id="actividad" className="rounded-lg border border-[#e6e9ef] bg-white px-6 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Actividad reciente</h2>
              <a href="#actividad" className="text-[14px] font-medium text-[#2563eb]">Ver todas</a>
            </div>
            <div className="mt-5 space-y-4">
              {actividad.length > 0 ? (
                actividad.map((evento, index) => {
                  const actor =
                    evento.titulo.toLowerCase().includes("agente")
                      ? agenteActivo
                      : detalle.ownership.responsable_humano
                        ? responsable
                        : { iniciales: "OC", nombre: "OpenCore" };

                  return (
                    <article key={`${evento.titulo}-${index}`} className="flex gap-4 border-b border-[#edf0f4] pb-4 last:border-b-0 last:pb-0">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${pillClass(index === 0 ? "slate" : index === 1 ? "purple" : "green")}`}>
                        {actor.iniciales}
                      </span>
                      <div>
                        <p className="text-[14px] text-[#242b37]">
                          <span className="font-semibold">{actor.nombre}</span> {evento.titulo.toLowerCase()}
                        </p>
                        <p className="mt-1 text-[12.5px] text-[#6b7688]">{formatearFecha(evento.fecha)}</p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="text-[14px] text-[#6b7688]">No hay actividad reciente registrada.</p>
              )}
            </div>
          </section>

          <HistorialAgenteIA
            historial={historialAgenteIA}
            error={historialAgenteIAError}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#e6e9ef] bg-white px-5 py-5">
            <h2 className="text-[16px] font-semibold text-[#111827]">Información rápida</h2>
            <dl className="mt-5 space-y-5 text-[14px]">
              {[
                ["ID del caso", displayId],
                ["Estado", estado],
                ["Prioridad", prioridad.replace(" prioridad", "")],
                ["Tipo", tipo],
                ["Área", detalle.estadoGlobal.macroarea_actual_label],
                ["Responsable humano", responsable.nombre],
                ["Agente activo", agenteActivo.nombre],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[1fr,1.05fr] gap-4">
                  <dt className="text-[#6b7688]">{label}</dt>
                  <dd className="text-[#242b37]">
                    {label === "Estado" || label === "Prioridad" ? (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={[
                            "h-2 w-2 rounded-full",
                            label === "Estado" ? "bg-[#f1ad21]" : "bg-[#de3b3b]",
                          ].join(" ")}
                        />
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="tareas" className="rounded-lg border border-[#e6e9ef] bg-white px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Tareas pendientes</h2>
              <a href="#tareas" className="text-[14px] font-medium text-[#2563eb]">Ver todas ({tareas.length})</a>
            </div>
            <div className="mt-5 space-y-5">
              {tareas.map((tarea, index) => (
                <article key={`${tarea.titulo}-${index}`} className="flex items-start gap-3">
                  <span className="mt-1 h-4 w-4 rounded-full border border-[#9aa4b2]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[14px] leading-5 text-[#242b37]">{tarea.titulo}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${pillClass(tarea.prioridad === "Alta" ? "red" : "amber")}`}>
                        {tarea.prioridad}
                      </span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[#6b7688]">
                      <Icon type="calendar" /> {formatearFechaCorta(tarea.fecha)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <Link
              href={siguienteAccion.href}
              className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-[#2563eb]"
            >
              <Icon type="plus" />
              Nueva tarea
            </Link>
          </section>

          <section id="documentos" className="rounded-lg border border-[#e6e9ef] bg-white px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Documentos recientes</h2>
              <a href="#documentos" className="text-[14px] font-medium text-[#2563eb]">Ver todos ({documentosVisibles.length})</a>
            </div>
            <div className="mt-5 space-y-4">
              {documentosVisibles.map((doc, index) => (
                <article key={`${doc.nombre}-${index}`} className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${pillClass(doc.tone)}`}>
                    <Icon type="file" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-[14px] text-[#242b37]">{doc.nombre}</p>
                  <p className="shrink-0 text-[12.5px] text-[#6b7688]">{index === 0 ? "Hoy" : formatearFechaCorta(doc.fecha)}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="notas" className="rounded-lg border border-[#e6e9ef] bg-white px-5 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-semibold text-[#111827]">Notas destacadas</h2>
              <a href="#notas" className="text-[14px] font-medium text-[#2563eb]">Ver todas ({Math.max(1, notas.length)})</a>
            </div>
            <div className="mt-5 flex gap-3">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${pillClass("amber")}`}>
                <Icon type="note" />
              </span>
              <div>
                <p className="text-[14px] leading-6 text-[#242b37]">
                  {notas[0] || "Pendiente confirmación de condiciones principales con el cliente."}
                </p>
                <p className="mt-2 text-[12.5px] text-[#6b7688]">
                  {responsable.nombre} - {formatearFecha(fechaCreacion)}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
