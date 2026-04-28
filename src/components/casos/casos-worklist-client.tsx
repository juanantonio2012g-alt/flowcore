"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CasoWorklistItem } from "@/core/application/casos";
import { derivarSemanticaCasoOperativo } from "@/core/application/organigrama/semantica";
import type { OrganigramaEstadoContexto } from "@/core/application/organigrama/contracts";
import { resolverRutaAccionSugerida } from "@/lib/recomendacion/rutas";
import { formatearFecha } from "@/lib/fecha";

export type { CasoWorklistItem } from "@/core/application/casos";

type Props = {
  casos: CasoWorklistItem[];
  macroareaInicial?: string;
  busquedaInicial?: string;
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function prioridadBadge(prioridad: string | null) {
  switch (prioridad) {
    case "urgente":
      return "border-red-500/30 bg-red-50 text-red-700";
    case "alta":
      return "border-amber-500/30 bg-amber-50 text-amber-700";
    case "media":
      return "border-sky-500/30 bg-sky-50 text-sky-700";
    case "baja":
      return "border-[color:var(--line)] bg-white text-slate-700";
    default:
      return "border-[color:var(--line)] bg-white text-slate-700";
  }
}

function continuityBadge(caso: CasoWorklistItem) {
  if (!caso.proxima_fecha_real || !caso.proxima_accion_real) {
      return {
        label: "Sin continuidad",
        className: "border-violet-500/30 bg-violet-50 text-violet-700",
      };
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const fecha = new Date(`${caso.proxima_fecha_real}T00:00:00`);
  fecha.setHours(0, 0, 0, 0);

  if (fecha.getTime() < hoy.getTime()) {
      return {
        label: "Retrasado",
        className: "border-red-500/30 bg-red-50 text-red-700",
      };
  }

  if (fecha.getTime() === hoy.getTime()) {
      return {
        label: "Hoy",
        className: "border-amber-500/30 bg-amber-50 text-amber-700",
      };
  }

  if (fecha.getTime() === manana.getTime()) {
      return {
        label: "Mañana",
        className: "border-sky-500/30 bg-sky-50 text-sky-700",
      };
  }

  return {
    label: "Programado",
    className: "border-[color:var(--line)] bg-white text-slate-700",
  };
}

function contextoBadge(estado: OrganigramaEstadoContexto) {
  switch (estado) {
    case "incidencia":
      return "border-amber-500/30 bg-amber-50 text-amber-700";
    case "normal":
      return "border-emerald-500/30 bg-emerald-50 text-emerald-700";
  }
}

function riskAccent(riesgo: CasoWorklistItem["riesgo"]) {
  switch (riesgo) {
    case "alto":
      return "before:bg-red-400";
    case "medio":
      return "before:bg-amber-300";
    case "bajo":
      return "before:bg-emerald-300";
  }
}

export default function CasosWorklistClient({
  casos,
  macroareaInicial = "todas",
  busquedaInicial = "",
}: Props) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [riesgo, setRiesgo] = useState("todos");
  const [prioridad, setPrioridad] = useState("todas");
  const [estadoComercial, setEstadoComercial] = useState("todos");
  const [requiereValidacion, setRequiereValidacion] = useState("todos");
  const [macroarea, setMacroarea] = useState(macroareaInicial);

  const casosFiltrados = useMemo(() => {
    return casos
      .map((caso) => ({
        ...caso,
        semantica: derivarSemanticaCasoOperativo(caso),
      }))
      .filter((caso) => {
        const texto = `${caso.id} ${caso.cliente} ${caso.proyecto} ${caso.proxima_accion_real} ${caso.recomendacion_accion} ${caso.macroarea_label} ${caso.semantica.etapa_label} ${caso.semantica.estado_contexto_label}`.toLowerCase();

        const coincideBusqueda =
          busqueda.trim() === "" || texto.includes(busqueda.trim().toLowerCase());

        const coincideRiesgo = riesgo === "todos" || caso.riesgo === riesgo;
        const coincidePrioridad =
          prioridad === "todas" || (caso.prioridad ?? "") === prioridad;
        const coincideEstado =
          estadoComercial === "todos" || caso.estado_comercial_real === estadoComercial;
        const validacionPendiente =
          caso.validacion_pendiente ?? caso.requiere_validacion;
        const coincideValidacion =
          requiereValidacion === "todos" ||
          (requiereValidacion === "si" && validacionPendiente) ||
          (requiereValidacion === "no" && !validacionPendiente);
        const coincideMacroarea =
          macroarea === "todas" || caso.macroarea_actual === macroarea;

        return (
          coincideBusqueda &&
          coincideRiesgo &&
          coincidePrioridad &&
          coincideEstado &&
          coincideValidacion &&
          coincideMacroarea
        );
      });
  }, [casos, busqueda, riesgo, prioridad, estadoComercial, requiereValidacion, macroarea]);

  const resumenOperativo = useMemo(() => {
    return {
      retrasados: casosFiltrados.filter((caso) => continuityBadge(caso).label === "Retrasado")
        .length,
      hoy: casosFiltrados.filter((caso) => continuityBadge(caso).label === "Hoy").length,
      validacion: casosFiltrados.filter(
        (caso) => caso.validacion_pendiente ?? caso.requiere_validacion
      ).length,
      continuidad: casosFiltrados.filter(
        (caso) => !caso.proxima_accion_real || !caso.proxima_fecha_real
      ).length,
    };
  }, [casosFiltrados]);

  return (
    <section className="grid gap-4 xl:grid-cols-[300px,minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="oc-card p-5 xl:p-6">
          <p className="oc-label">Filtros</p>
          <h3 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] text-slate-900">
            Recorta la operación con una lectura más limpia
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Busca casos por cliente, riesgo, continuidad, validación y ownership.
          </p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                Buscar
              </label>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Cliente, etapa o acción"
                className="oc-input"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Riesgo
                </label>
                <select
                  value={riesgo}
                  onChange={(e) => setRiesgo(e.target.value)}
                  className="oc-input"
                >
                  <option value="todos">Todos</option>
                  <option value="alto">Alto</option>
                  <option value="medio">Medio</option>
                  <option value="bajo">Bajo</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Prioridad
                </label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="oc-input"
                >
                  <option value="todas">Todas</option>
                  <option value="urgente">Urgente</option>
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Estado comercial
                </label>
                <select
                  value={estadoComercial}
                  onChange={(e) => setEstadoComercial(e.target.value)}
                  className="oc-input"
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

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Validación
                </label>
                <select
                  value={requiereValidacion}
                  onChange={(e) => setRequiereValidacion(e.target.value)}
                  className="oc-input"
                >
                  <option value="todos">Todos</option>
                  <option value="si">Requiere validación</option>
                  <option value="no">Sin validación</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                  Macroárea
                </label>
                <select
                  value={macroarea}
                  onChange={(e) => setMacroarea(e.target.value)}
                  className="oc-input"
                >
                  <option value="todas">Todas</option>
                  <option value="operaciones">Operaciones</option>
                  <option value="tecnico">Técnico</option>
                  <option value="comercial">Comercial</option>
                  <option value="administracion">Administración</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="oc-card-soft p-5 xl:p-6">
          <p className="oc-label">Lectura rápida</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="oc-card-muted p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Resultados</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-900">
                {casosFiltrados.length}
              </p>
            </div>
            <div className="oc-card-muted p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Retrasados</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-red-700">
                {resumenOperativo.retrasados}
              </p>
            </div>
            <div className="oc-card-muted p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Para hoy</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-amber-700">
                {resumenOperativo.hoy}
              </p>
            </div>
            <div className="oc-card-muted p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Sin continuidad</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-violet-700">
                {resumenOperativo.continuidad}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="oc-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color:var(--line)] px-5 py-5 xl:flex-row xl:items-end xl:justify-between xl:px-6 xl:py-6">
          <div>
            <p className="oc-label">Worklist</p>
            <h3 className="mt-3 text-[1.9rem] font-semibold tracking-[-0.045em] text-slate-900">
              Casos listos para intervención
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Cada tarjeta resume dónde está el caso, qué sigue y qué ownership debería
              tomarlo ahora.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="oc-chip">Validación: {resumenOperativo.validacion}</span>
            <span className="oc-chip">Retrasados: {resumenOperativo.retrasados}</span>
            <span className="oc-chip">Para hoy: {resumenOperativo.hoy}</span>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4 xl:px-5 xl:py-5">
          {casosFiltrados.length === 0 ? (
            <div className="oc-card-muted px-5 py-12 text-center">
              <p className="text-sm font-medium text-slate-900">
                No hay casos que coincidan con los filtros
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Ajusta la búsqueda o abre el rango de macroáreas para reconstruir la cola.
              </p>
            </div>
          ) : (
            casosFiltrados.map((caso) => {
              const continuidad = continuityBadge(caso);
              const semantica = caso.semantica;
              const validacionPendiente =
                caso.validacion_pendiente ?? caso.requiere_validacion;
              const accion = resolverRutaAccionSugerida(caso.id, caso.recomendacion_accion);

              return (
                <article
                  key={caso.id}
                  className={[
                    "relative overflow-hidden rounded-[26px] border border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,244,237,0.98))] px-5 py-5 shadow-[0_20px_42px_rgba(17,33,43,0.08)] before:absolute before:inset-y-0 before:left-0 before:w-1.5 xl:px-6 xl:py-6",
                    riskAccent(caso.riesgo),
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`oc-chip ${prioridadBadge(caso.prioridad)}`}>
                          {caso.prioridad ? formatearTexto(caso.prioridad) : "Sin prioridad"}
                        </span>
                        <span className={`oc-chip ${continuidad.className}`}>{continuidad.label}</span>
                        <span className={`oc-chip ${contextoBadge(semantica.estado_contexto)}`}>
                          {semantica.estado_contexto_label}
                        </span>
                        {validacionPendiente ? (
                          <span className="oc-chip border-amber-500/30 bg-amber-50 text-amber-700">
                            Validación pendiente
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-[1.45rem] font-semibold tracking-[-0.04em] text-slate-900">
                            {caso.cliente}
                          </p>
                          <span className="text-sm text-slate-500">{caso.proyecto}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span>Etapa actual: {semantica.etapa_label}</span>
                          <span>Ownership: {caso.macroarea_label}</span>
                          <span>ID: {caso.id.slice(0, 8)}</span>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 lg:grid-cols-3">
                        <div className="oc-card-muted p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Próxima acción
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {caso.proxima_accion_real || "Definir continuidad"}
                          </p>
                        </div>
                        <div className="oc-card-muted p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Próxima fecha
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatearFecha(caso.proxima_fecha_real)}
                          </p>
                        </div>
                        <div className="oc-card-muted p-4">
                          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Qué sugiere el sistema
                          </p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {caso.recomendacion_accion}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full shrink-0 xl:w-[265px]">
                      <div className="oc-card-muted p-4">
                        <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                          Acción operativa
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {caso.recomendacion_motivo}
                        </p>
                        <div className="mt-4 space-y-2">
                          <Link href={accion.href} className="oc-button w-full">
                            {accion.label}
                          </Link>
                          <Link
                            href={`/casos/${caso.id}`}
                            className="oc-button-secondary w-full"
                          >
                            Abrir caso
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
