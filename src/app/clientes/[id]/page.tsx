import Link from "next/link";
import CasosBulkUpdate from "@/components/dashboard/casos-bulk-update";
import EventosFeed from "@/components/ui/eventos-feed";
import { getClienteDetalleReadModel } from "@/core/application/clientes";
import { formatearFecha } from "@/lib/fecha";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    accion?: string;
  }>;
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function badgeRiesgo(riesgo: "alto" | "medio" | "bajo") {
  if (riesgo === "alto") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }
  if (riesgo === "medio") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
}

function badgeNivel(valor: string) {
  const limpio = valor.trim().toLowerCase();
  const base = "rounded-full border px-2 py-0.5 text-[11px]";

  if (limpio === "alto" || limpio === "alta") {
    return `${base} border-red-500/30 bg-red-500/10 text-red-300`;
  }
  if (limpio === "medio" || limpio === "media") {
    return `${base} border-amber-500/30 bg-amber-500/10 text-amber-300`;
  }
  if (limpio === "bajo" || limpio === "baja") {
    return `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
  }

  return `${base} border-slate-700 bg-slate-950 text-slate-300`;
}

function badgeContexto(estado: "normal" | "incidencia") {
  const base = "rounded-full border px-2 py-0.5 text-[11px]";
  return estado === "incidencia"
    ? `${base} border-red-500/30 bg-red-500/10 text-red-300`
    : `${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-300`;
}

export default async function ClienteDetallePage({ params, searchParams }: Props) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const accionInicial = (resolvedSearchParams.accion ?? "").trim().toLowerCase();

  let detalle;

  try {
    detalle = await getClienteDetalleReadModel(id);
  } catch {
    return (
      <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Cliente</h1>
          <p className="mt-3 text-sm text-red-400">No se pudo cargar el cliente.</p>
          <div className="mt-4">
            <Link
              href="/clientes"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Volver a clientes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!detalle) {
    return (
      <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
        <div className="w-full">
          <h1 className="text-2xl font-bold">Cliente</h1>
          <p className="mt-3 text-sm text-red-400">No se pudo cargar el cliente.</p>
          <div className="mt-4">
            <Link
              href="/clientes"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Volver a clientes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const casosTacticos = accionInicial
    ? [
        ...detalle.casos.filter((caso) =>
          caso.recomendacion_accion.toLowerCase().includes(accionInicial)
        ),
        ...detalle.casos.filter(
          (caso) => !caso.recomendacion_accion.toLowerCase().includes(accionInicial)
        ),
      ]
    : detalle.casos;

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="w-full space-y-4">
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Unidad relacional táctica</p>
              <h1 className="text-2xl font-bold text-slate-100">{detalle.cliente.nombre}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {detalle.cliente.empresa || "Sin empresa"} · Carga operativa y lectura táctica del vínculo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/clientes"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Volver a clientes
              </Link>
              <Link
                href="/casos"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Ir a casos
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Volver al dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <article className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <p className="text-xs text-slate-400">Total de casos</p>
            <p className="mt-1 text-xl font-semibold text-slate-100">
              {detalle.resumen.total_casos}
            </p>
          </article>
          <article className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-emerald-300/80">Casos activos</p>
            <p className="mt-1 text-xl font-semibold text-emerald-300">
              {detalle.resumen.activos}
            </p>
          </article>
          <article className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-red-300/80">Casos en riesgo</p>
            <p className="mt-1 text-xl font-semibold text-red-300">
              {detalle.resumen.en_riesgo}
            </p>
          </article>
          <article className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <p className="text-xs text-sky-300/80">Con próxima fecha</p>
            <p className="mt-1 text-xl font-semibold text-sky-300">
              {detalle.resumen.con_proxima_fecha}
            </p>
          </article>
          <article className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-300/80">Validaciones pendientes</p>
            <p className="mt-1 text-xl font-semibold text-amber-300">
              {detalle.resumen.validaciones_pendientes}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-100">Perfil relacional del cliente</h2>
            <p className="text-xs text-slate-400">Cómo está la relación y qué atención táctica conviene.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={badgeNivel(detalle.estado_relacional.confianza)}>
              Confianza: {detalle.estado_relacional.confianza}
            </span>
            <span className={badgeNivel(detalle.estado_relacional.friccion)}>
              Fricción: {detalle.estado_relacional.friccion}
            </span>
            <span className={badgeNivel(detalle.estado_relacional.conversion)}>
              Conversión: {detalle.estado_relacional.conversion}
            </span>
            <span className={badgeNivel(detalle.estado_relacional.prioridad_relacional)}>
              Prioridad: {detalle.estado_relacional.prioridad_relacional}
            </span>
            <p className="ml-0 w-full text-sm text-slate-300 xl:ml-2 xl:w-auto">
              {detalle.estado_relacional.lectura_vinculo}
            </p>
          </div>
          {detalle.alertas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {detalle.alertas.slice(0, 6).map((alerta) => (
                <span
                  key={alerta.codigo}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    alerta.severidad === "critical"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : alerta.severidad === "warning"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                        : "border-slate-700 bg-slate-950 text-slate-300"
                  }`}
                >
                  {alerta.label}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">Casos del cliente</h2>
              <p className="text-xs text-slate-400">
                Lectura agrupada de prioridad, riesgo y recomendación operativa.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Mostrando <span className="text-slate-200">{casosTacticos.length}</span> casos
            </p>
          </header>

          {accionInicial && (
            <div className="border-b border-slate-800 bg-slate-950/40 px-4 py-2 text-xs text-slate-300">
              Filtro táctico activo por acción: <span className="text-slate-100">{accionInicial}</span>
            </div>
          )}

          <div className="hidden grid-cols-[100px_95px_130px_110px_160px_minmax(240px,2fr)_140px_minmax(210px,2fr)_100px] gap-3 border-b border-slate-800 px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 xl:grid">
            <span>Caso</span>
            <span>Prioridad</span>
            <span>Estado comercial</span>
            <span>Riesgo</span>
            <span>Ownership</span>
            <span>Acción en curso</span>
            <span>Próxima fecha</span>
            <span>Recomendación</span>
            <span className="text-right">Acceso</span>
          </div>

          <div className="divide-y divide-slate-800">
            {casosTacticos.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">Este cliente todavía no tiene casos.</div>
            ) : (
              casosTacticos.map((caso) => (
                <Link
                  key={caso.id}
                  href={`/casos/${caso.id}`}
                  className="block px-4 py-4 transition hover:bg-slate-950/70"
                >
                  <div className="space-y-3 xl:hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Caso {caso.id.slice(0, 8)}</p>
                        <p className="text-xs text-slate-400">
                          {formatearTexto(caso.prioridad || "sin_prioridad")} · {formatearTexto(caso.estado_comercial || "sin_estado")}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badgeRiesgo(caso.riesgo)}`}>
                        {formatearTexto(caso.riesgo)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300">
                        Responsable: {caso.ownership_operativo}
                      </span>
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300">
                        Etapa: {caso.semantica_operativa.etapa_label}
                      </span>
                      <span className={badgeContexto(caso.semantica_operativa.estado_contexto)}>
                        {caso.semantica_operativa.estado_contexto_label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      {caso.semantica_operativa.accion_actual}
                    </p>
                    <p className="text-xs text-slate-400">Fecha: {formatearFecha(caso.proxima_fecha)}</p>
                    <p className="text-xs text-slate-300">
                      {caso.recomendacion_accion} · {formatearTexto(caso.recomendacion_urgencia)}
                    </p>
                  </div>

                  <div className="hidden grid-cols-[100px_95px_130px_110px_160px_minmax(240px,2fr)_140px_minmax(210px,2fr)_100px] items-center gap-3 xl:grid">
                    <p className="text-sm font-medium text-slate-100">{caso.id.slice(0, 8)}</p>
                    <p className="text-sm text-slate-300">{formatearTexto(caso.prioridad || "-")}</p>
                    <p className="text-sm text-slate-300">{formatearTexto(caso.estado_comercial || "-")}</p>
                    <span className={`w-fit rounded-full border px-2 py-0.5 text-[11px] ${badgeRiesgo(caso.riesgo)}`}>
                      {formatearTexto(caso.riesgo)}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm text-slate-300">{caso.ownership_operativo}</p>
                      <p className="text-[11px] text-slate-500">{caso.semantica_operativa.etapa_label}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="truncate text-sm text-slate-300">{caso.semantica_operativa.accion_actual}</p>
                      <span className={badgeContexto(caso.semantica_operativa.estado_contexto)}>
                        {caso.semantica_operativa.estado_contexto_label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{formatearFecha(caso.proxima_fecha)}</p>
                    <p className="truncate text-sm text-slate-300">
                      {caso.recomendacion_accion} · {formatearTexto(caso.recomendacion_urgencia)}
                    </p>
                    <div className="text-right">
                      <span className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300">
                        Abrir caso
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <EventosFeed
            titulo="Actividad del cliente"
            descripcion="Eventos recientes consolidados de los casos de este cliente"
            eventos={detalle.actividad}
          />

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-base font-semibold text-slate-100">Movimientos recientes</h2>
            <p className="mt-1 text-xs text-slate-400">
              Seguimientos y cotizaciones recientes vinculados a este cliente.
            </p>

            <div className="mt-3 divide-y divide-slate-800">
              {detalle.movimientos.length === 0 ? (
                <p className="py-3 text-sm text-slate-400">No hay movimientos recientes para mostrar.</p>
              ) : (
                detalle.movimientos.map((mov) => (
                  <Link
                    key={mov.id}
                    href={`/casos/${mov.caso_id}`}
                    className="flex items-start justify-between gap-3 py-3 text-sm hover:text-slate-100"
                  >
                    <div>
                      <p className="text-slate-200">{mov.tipo}</p>
                      <p className="mt-1 text-xs text-slate-400">{mov.detalle}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Caso {mov.caso_id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatearFecha(mov.fecha)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-slate-100">Intervención táctica</h2>
            <p className="text-xs text-slate-400">
              Acciones agrupadas para mover el conjunto de casos del cliente.
            </p>
          </div>

          {detalle.intervenciones.length === 0 ? (
            <p className="text-sm text-slate-400">No hay intervenciones sugeridas para este cliente.</p>
          ) : (
            <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detalle.intervenciones.map((item, index) => (
                <div key={`${item.accion}-${index}`} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{item.accion}</p>
                    <span className={badgeNivel(item.urgencia)}>{formatearTexto(item.urgencia)}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{item.total} caso(s) · {item.motivo}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                    <p className="text-slate-500">Fecha sugerida: {item.fecha || "-"}</p>
                    {item.casos[0] && (
                      <Link href={`/casos/${item.casos[0]}`} className="text-slate-300 hover:underline">
                        Abrir caso
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <CasosBulkUpdate casos={detalle.bulk_items} />
        </section>
      </div>
    </main>
  );
}
