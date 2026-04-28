"use client";

import Link from "next/link";
import CasoInlineQuickUpdate from "@/components/dashboard/caso-inline-quick-update";
import { useEffect, useMemo, useState } from "react";
import { resolverRutaAccionSugerida } from "@/lib/recomendacion/rutas";
import { formatearFecha } from "@/lib/fecha";

export type CasoClienteFiltrable = {
  id: string;
  prioridad: string | null;
  estado_tecnico: string | null;
  estado_comercial: string | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  created_at: string | null;
  riesgo: "alto" | "medio" | "bajo";
  recomendacion_accion: string;
  recomendacion_urgencia: "alta" | "media" | "baja";
  recomendacion_motivo: string;
  recomendacion_fecha: string | null;
};

type Props = {
  casos: CasoClienteFiltrable[];
  busquedaInicial?: string;
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function badgeRiesgo(riesgo: "alto" | "medio" | "bajo") {
  switch (riesgo) {
    case "alto":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "medio":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    default:
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
}

export default function ClienteCasosFiltrados({
  casos,
  busquedaInicial = "",
}: Props) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [riesgo, setRiesgo] = useState("todos");
  const [prioridad, setPrioridad] = useState("todas");
  const [estadoComercial, setEstadoComercial] = useState("todos");

  useEffect(() => {
    setBusqueda(busquedaInicial);
  }, [busquedaInicial]);

  const filtrados = useMemo(() => {
    return casos.filter((caso) => {
      const texto =
        `${caso.id} ${caso.proxima_accion ?? ""} ${caso.recomendacion_accion ?? ""}`.toLowerCase();

      const coincideBusqueda =
        busqueda.trim() === "" || texto.includes(busqueda.trim().toLowerCase());

      const coincideRiesgo = riesgo === "todos" || caso.riesgo === riesgo;
      const coincidePrioridad =
        prioridad === "todas" || (caso.prioridad ?? "") === prioridad;
      const coincideEstado =
        estadoComercial === "todos" || (caso.estado_comercial ?? "") === estadoComercial;

      return (
        coincideBusqueda &&
        coincideRiesgo &&
        coincidePrioridad &&
        coincideEstado
      );
    });
  }, [casos, busqueda, riesgo, prioridad, estadoComercial]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Filtros del cliente</h2>
          <p className="mt-1 text-xs text-slate-400">
            Explora los casos de este cliente por señales operativas
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Caso, próxima acción o acción sugerida"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Riesgo</label>
            <select
              value={riesgo}
              onChange={(e) => setRiesgo(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option value="todos">Todos</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Prioridad</label>
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option value="todas">Todas</option>
              <option value="urgente">Urgente</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Estado comercial</label>
            <select
              value={estadoComercial}
              onChange={(e) => setEstadoComercial(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            >
              <option value="todos">Todos</option>
              <option value="sin_cotizar">Sin cotizar</option>
              <option value="en_proceso">En proceso</option>
              <option value="negociacion">Negociación</option>
              <option value="cotizado">Cotizado</option>
              <option value="aprobado">Aprobado</option>
              <option value="rechazado">Rechazado</option>
              <option value="pausado">Pausado</option>
            </select>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Resultado filtrado: {filtrados.length} caso(s)
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Historial de casos</h2>
          <p className="mt-1 text-sm text-slate-400">
            Casos del cliente priorizados por riesgo y filtros
          </p>
        </div>

        <div className="divide-y divide-slate-800">
          {filtrados.length === 0 ? (
            <div className="px-6 py-6 text-sm text-slate-400">
              No hay casos para mostrar con esos filtros.
            </div>
          ) : (
            filtrados.map((caso) => (
              <div key={caso.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Caso {caso.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {caso.prioridad ? formatearTexto(caso.prioridad) : "Sin prioridad"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${badgeRiesgo(caso.riesgo)}`}>
                        riesgo: {formatearTexto(caso.riesgo)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={resolverRutaAccionSugerida(caso.id, caso.recomendacion_accion).href}
                      className="rounded-full border border-slate-700 bg-slate-100 px-3 py-1 text-[11px] text-slate-950 hover:bg-white"
                    >
                      {resolverRutaAccionSugerida(caso.id, caso.recomendacion_accion).label}
                    </Link>
                    <Link
                      href={`/casos/${caso.id}`}
                      className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                    >
                      Abrir caso
                    </Link>
                  </div>
                </div>

                <CasoInlineQuickUpdate
                  casoId={caso.id}
                  proximaAccionInicial={caso.proxima_accion || ""}
                  proximaFechaInicial={caso.proxima_fecha ? caso.proxima_fecha.slice(0, 10) : ""}
                  estadoComercialInicial={caso.estado_comercial || ""}
                  recomendacionAccion={caso.recomendacion_accion}
                  recomendacionFecha={caso.recomendacion_fecha}
                  recomendacionUrgencia={caso.recomendacion_urgencia}
                />

                <div className="mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Estado técnico
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {caso.estado_tecnico ? formatearTexto(caso.estado_tecnico) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Estado comercial
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {caso.estado_comercial ? formatearTexto(caso.estado_comercial) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Próxima acción
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {caso.proxima_accion || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Próxima fecha
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatearFecha(caso.proxima_fecha)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Acción sugerida
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {caso.recomendacion_accion}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">
                      Urgencia sugerida
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      {formatearTexto(caso.recomendacion_urgencia)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
