import Link from "next/link";
import AreaCasosFiltrados from "@/components/filtros/area-casos-filtrados";
import CasosBulkUpdate from "@/components/dashboard/casos-bulk-update";
import EventosFeed from "@/components/ui/eventos-feed";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import {
  derivarSemanticaCasoOperativo,
  type OrganigramaEstadoContexto,
} from "@/core/application/organigrama";
import { construirEventosCaso } from "@/lib/eventos/casos";
import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";

type Props = {
  params: Promise<{
    area: string;
  }>;
};

type AlertaArea = {
  id: string;
  casoId: string;
  titulo: string;
  descripcion: string;
  nivel: "rojo" | "amarillo";
  responsable: string;
  etapa_label: string;
  accion_actual: string;
  estado_contexto: OrganigramaEstadoContexto;
  estado_contexto_label: string;
};

function metaArea(area: string) {
  switch (area) {
    case "operaciones":
      return {
        titulo: "Operaciones",
        descripcion:
          "Casos que requieren control de flujo, próxima acción y continuidad operativa.",
      };
    case "comercial":
      return {
        titulo: "Comercial",
        descripcion: "Casos en negociación, cotización o seguimiento comercial.",
      };
    case "tecnico":
      return {
        titulo: "Técnico",
        descripcion:
          "Casos que requieren criterio técnico, diagnóstico o validación.",
      };
    case "administracion":
      return {
        titulo: "Administración / Soporte",
        descripcion:
          "Casos con datos incompletos o necesidades de control documental y soporte.",
      };
    default:
      return {
        titulo: "Área",
        descripcion: "Vista filtrada del sistema.",
      };
  }
}

function esAreaValida(area: string) {
  return (
    area === "operaciones" ||
    area === "tecnico" ||
    area === "comercial" ||
    area === "administracion"
  );
}

function contextoClasses(estado: OrganigramaEstadoContexto) {
  switch (estado) {
    case "incidencia":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "normal":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
}

export default async function AreaPage({ params }: Props) {
  const { area } = await params;
  const meta = metaArea(area);

  let readModel;

  try {
    readModel = await getCasosNormalizados();
  } catch {
    return (
      <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
        <div className="w-full">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: meta.titulo },
            ]}
          />
          <h1 className="text-3xl font-bold">{meta.titulo}</h1>
          <p className="mt-4 text-red-400">Hubo un error cargando esta área.</p>
        </div>
      </main>
    );
  }

  const casos = readModel.items.filter((caso) =>
    esAreaValida(area) ? caso.macroarea_actual === area : true
  );
  const focoActual = casos[0]
    ? {
        casoId: casos[0].id,
        cliente: casos[0].cliente,
        responsable: casos[0].macroarea_label,
        ...derivarSemanticaCasoOperativo(casos[0]),
      }
    : null;

  const total = casos.length;
  const alto = casos.filter((caso) => caso.riesgo === "alto").length;
  const continuidadPendiente = casos.filter((caso) =>
    ["pendiente", "bloqueada", "vencida"].includes(
      caso.workflow_continuidad_estado ?? ""
    )
  ).length;
  const slaInconsistente = casos.filter(
    (caso) => caso.workflow_alineacion_sla === "inconsistente"
  ).length;

  const saludArea = (() => {
    if (alto > 0 || continuidadPendiente >= 3 || slaInconsistente > 0) {
      return {
        titulo: "Área en atención prioritaria",
        descripcion:
          "Hay casos con riesgo alto, continuidad desfasada o SLA inconsistente que requieren intervención.",
        clases: "border-red-500/20 bg-red-500/5 text-red-200",
        badge: "bg-red-500/15 text-red-300 border border-red-500/30",
      };
    }

    if (continuidadPendiente > 0) {
      return {
        titulo: "Área en observación",
        descripcion:
          "El área mantiene carga operativa con continuidad por definir o en tensión.",
        clases: "border-amber-500/20 bg-amber-500/5 text-amber-200",
        badge: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
      };
    }

    return {
      titulo: "Área estable",
      descripcion: "La carga actual del área se mantiene bajo control.",
      clases: "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
      badge: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    };
  })();

  const eventosArea = casos
    .flatMap((caso) =>
      construirEventosCaso({
        caso: {
          id: caso.id,
          created_at: caso.created_at,
          clientes: caso.cliente_id ? { id: caso.cliente_id } : null,
        },
        alertas: [
          ...(caso.riesgo === "alto"
            ? [
                {
                  titulo: "Caso con riesgo alto",
                  detalle:
                    caso.recomendacion_accion ??
                    caso.proxima_accion_real ??
                    "Atención prioritaria requerida.",
                  fecha: caso.recomendacion_fecha ?? caso.proxima_fecha_real ?? caso.created_at,
                  nivel: "critical" as const,
                },
              ]
            : []),
          ...(["pendiente", "bloqueada", "vencida"].includes(
            caso.workflow_continuidad_estado ?? ""
          )
            ? [
                {
                  titulo: "Continuidad del caso en tensión",
                  detalle:
                    caso.recomendacion_motivo ||
                    caso.workflow_alertas?.[0] ||
                    "La continuidad operativa del caso requiere revisión.",
                  fecha: caso.recomendacion_fecha ?? caso.proxima_fecha_real ?? caso.created_at,
                  nivel:
                    caso.workflow_continuidad_estado === "vencida"
                      ? ("critical" as const)
                      : ("warning" as const),
                },
              ]
            : []),
          ...(caso.workflow_alineacion_sla === "inconsistente"
            ? [
                {
                  titulo: "SLA desalineado",
                  detalle:
                    caso.workflow_alertas?.[0] ??
                    "El SLA actual no coincide del todo con la continuidad real del caso.",
                  fecha:
                    caso.workflow_ultima_transicion_at ??
                    caso.proxima_fecha_real ??
                    caso.created_at,
                  nivel: "warning" as const,
                },
              ]
            : []),
        ],
      })
    )
    .sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
      return fechaB - fechaA;
    })
    .slice(0, 12);

  const alertasArea: AlertaArea[] = casos
    .flatMap((caso) => {
      const alertas: AlertaArea[] = [];

      if (caso.riesgo === "alto") {
        const semantica = derivarSemanticaCasoOperativo(caso);
        alertas.push({
          id: `riesgo-${caso.id}`,
          casoId: caso.id,
          titulo: "Riesgo alto",
          descripcion: `${caso.cliente} · ${
            caso.recomendacion_accion || caso.proxima_accion_real || "Atención prioritaria"
          }`,
          nivel: "rojo",
          responsable: caso.macroarea_label,
          etapa_label: semantica.etapa_label,
          accion_actual: semantica.accion_actual,
          estado_contexto: semantica.estado_contexto,
          estado_contexto_label: semantica.estado_contexto_label,
        });
      }

      if (["pendiente", "bloqueada", "vencida"].includes(caso.workflow_continuidad_estado ?? "")) {
        const semantica = derivarSemanticaCasoOperativo(caso);
        alertas.push({
          id: `continuidad-${caso.id}`,
          casoId: caso.id,
          titulo:
            caso.workflow_continuidad_estado === "vencida"
              ? "Continuidad vencida"
              : "Continuidad incompleta",
          descripcion: `${caso.cliente} · ${
            caso.workflow_alertas?.[0] ?? caso.recomendacion_motivo
          }`,
          nivel:
            caso.workflow_continuidad_estado === "vencida" ? "rojo" : "amarillo",
          responsable: caso.macroarea_label,
          etapa_label: semantica.etapa_label,
          accion_actual: semantica.accion_actual,
          estado_contexto: semantica.estado_contexto,
          estado_contexto_label: semantica.estado_contexto_label,
        });
      }

      if (caso.workflow_alineacion_sla === "inconsistente") {
        const semantica = derivarSemanticaCasoOperativo(caso);
        alertas.push({
          id: `sla-${caso.id}`,
          casoId: caso.id,
          titulo: "SLA incoherente",
          descripcion: `${caso.cliente} · ${
            caso.workflow_alertas?.[0] ?? "Revisar alineación entre continuidad y SLA"
          }`,
          nivel: "amarillo",
          responsable: caso.macroarea_label,
          etapa_label: semantica.etapa_label,
          accion_actual: semantica.accion_actual,
          estado_contexto: semantica.estado_contexto,
          estado_contexto_label: semantica.estado_contexto_label,
        });
      }

      return alertas;
    })
    .slice(0, 8);

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="w-full">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Vista filtrada por macroárea</p>
            <h1 className="text-3xl font-bold text-slate-100">{meta.titulo}</h1>
            <p className="mt-2 text-sm text-slate-400">{meta.descripcion}</p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 hover:bg-white"
          >
            Volver al dashboard
          </Link>
        </div>

        <section className={`mb-6 rounded-2xl border p-6 shadow-sm ${saludArea.clases}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Semáforo del área</h2>
              <p className="mt-1 text-sm opacity-80">{saludArea.descripcion}</p>
            </div>

            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${saludArea.badge}`}>
              {saludArea.titulo}
            </span>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Foco actual del área</h2>
            <p className="mt-1 text-sm text-slate-400">
              Lectura directa del caso hoy priorizado en esta macroárea, con etapa, acción y contexto.
            </p>
          </div>

          {!focoActual ? (
            <p className="text-sm text-slate-400">No hay casos activos visibles para esta área.</p>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Responsable actual</p>
                  <p className="mt-1 text-sm font-medium text-slate-100">{focoActual.responsable}</p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${contextoClasses(
                    focoActual.estado_contexto
                  )}`}
                >
                  {focoActual.estado_contexto_label}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Etapa</p>
                  <p className="mt-1 text-sm text-slate-200">{focoActual.etapa_label}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Acción en curso</p>
                  <p className="mt-1 text-sm text-slate-200">{focoActual.accion_actual}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Caso foco:{" "}
                <Link href={`/casos/${focoActual.casoId}`} className="text-slate-300 hover:underline">
                  {focoActual.cliente}
                </Link>
              </p>
            </div>
          )}
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <p className="text-sm text-slate-400">Casos del área</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-100">{total}</h2>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 shadow-sm">
            <p className="text-sm text-red-200/80">Riesgo alto</p>
            <h2 className="mt-2 text-3xl font-bold text-red-300">{alto}</h2>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-sm">
            <p className="text-sm text-amber-200/80">Continuidad en tensión</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-300">
              {continuidadPendiente}
            </h2>
          </div>
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 shadow-sm">
            <p className="text-sm text-sky-200/80">SLA incoherente</p>
            <h2 className="mt-2 text-3xl font-bold text-sky-300">
              {slaInconsistente}
            </h2>
          </div>
        </div>

        <CasosBulkUpdate
          casos={casos.map((caso) => ({
            id: caso.id,
            cliente: caso.cliente,
            proyecto: caso.proyecto,
            riesgo: caso.riesgo,
            estado_comercial_real: caso.estado_comercial_real,
            proxima_fecha_real: caso.proxima_fecha_real,
            recomendacion_accion: caso.recomendacion_accion,
            recomendacion_urgencia: caso.recomendacion_urgencia,
            recomendacion_fecha: caso.recomendacion_fecha,
          }))}
        />

        <section className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-amber-200">Alertas del área</h2>
            <p className="mt-1 text-sm text-amber-100/70">
              Señales clicables para intervenir rápido
            </p>
          </div>

          {alertasArea.length === 0 ? (
            <p className="text-sm text-slate-300">No hay alertas activas para esta área.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {alertasArea.map((alerta) => (
                <Link
                  key={alerta.id}
                  href={`/casos/${alerta.casoId}`}
                  className={[
                    "rounded-xl border bg-slate-950 px-4 py-3 text-sm transition hover:border-slate-500",
                    alerta.nivel === "rojo"
                      ? "border-red-500/20 text-red-200"
                      : "border-amber-500/20 text-amber-200",
                  ].join(" ")}
                >
                  <p className="font-medium">{alerta.titulo}</p>
                  <p className="mt-1 text-sm text-slate-300">{alerta.descripcion}</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-400">
                    <p>
                      Responsable: <span className="text-slate-200">{alerta.responsable}</span>
                    </p>
                    <p>
                      Etapa: <span className="text-slate-200">{alerta.etapa_label}</span>
                    </p>
                    <p>
                      Acción: <span className="text-slate-200">{alerta.accion_actual}</span>
                    </p>
                  </div>
                  <span
                    className={`mt-3 inline-flex rounded-full border px-2 py-0.5 text-[10px] ${contextoClasses(
                      alerta.estado_contexto
                    )}`}
                  >
                    {alerta.estado_contexto_label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <EventosFeed
          titulo="Eventos recientes del área"
          descripcion="Actividad consolidada de los casos vinculados a esta macroárea"
          eventos={eventosArea}
        />

        <AreaCasosFiltrados
          casos={casos.map((caso) => ({
            id: caso.id,
            cliente_id: caso.cliente_id,
            cliente: caso.cliente,
            proyecto: caso.proyecto,
            prioridad: caso.prioridad,
            estado_tecnico: caso.estado_tecnico_real,
            estado_comercial: caso.estado_comercial_real,
            proxima_accion: caso.proxima_accion_real,
            proxima_fecha: caso.proxima_fecha_real,
            riesgo: caso.riesgo,
            recomendacion_accion: caso.recomendacion_accion,
            recomendacion_urgencia: caso.recomendacion_urgencia,
            recomendacion_motivo: caso.recomendacion_motivo,
            recomendacion_fecha: caso.recomendacion_fecha,
          }))}
        />
      </div>
    </main>
  );
}
