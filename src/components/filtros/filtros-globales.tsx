"use client";

import { useEffect, useMemo, useState } from "react";

export type CasoFiltrable = {
  id: string;
  cliente: string;
  proyecto: string;
  prioridad: string | null;
  estado_comercial_real: string;
  riesgo: "alto" | "medio" | "bajo";
  recomendacion_accion?: string;
};

type Props = {
  items: CasoFiltrable[];
  render: (items: CasoFiltrable[]) => React.ReactNode;
  busquedaInicial?: string;
};

export default function FiltrosGlobales({
  items,
  render,
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
    return items.filter((item) => {
      const texto = `${item.cliente} ${item.proyecto} ${item.id} ${item.recomendacion_accion ?? ""}`.toLowerCase();
      const coincideBusqueda =
        busqueda.trim() === "" || texto.includes(busqueda.trim().toLowerCase());

      const coincideRiesgo = riesgo === "todos" || item.riesgo === riesgo;
      const coincidePrioridad =
        prioridad === "todas" || (item.prioridad ?? "") === prioridad;
      const coincideEstado =
        estadoComercial === "todos" || item.estado_comercial_real === estadoComercial;

      return (
        coincideBusqueda &&
        coincideRiesgo &&
        coincidePrioridad &&
        coincideEstado
      );
    });
  }, [items, busqueda, riesgo, prioridad, estadoComercial]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-100">Filtros globales</h2>
          <p className="mt-1 text-xs text-slate-400">
            Explora el sistema por señales operativas y comerciales
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Buscar</label>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Cliente, proyecto, caso o acción sugerida"
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

      {render(filtrados)}
    </div>
  );
}
