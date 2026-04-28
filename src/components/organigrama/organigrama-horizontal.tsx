import Link from "next/link";
import type {
  OrganigramaCarga,
  OrganigramaEstadoContexto,
  OrganigramaEstado,
  OrganigramaReadModel,
} from "@/core/application/organigrama";

function colorClasses(color: "blue" | "emerald" | "violet" | "amber") {
  switch (color) {
    case "blue":
      return {
        borde: "border-sky-500/20",
        fondo: "bg-sky-500/5",
        badge: "border-sky-500/30 bg-sky-500/10 text-sky-300",
      };
    case "emerald":
      return {
        borde: "border-emerald-500/20",
        fondo: "bg-emerald-500/5",
        badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      };
    case "violet":
      return {
        borde: "border-violet-500/20",
        fondo: "bg-violet-500/5",
        badge: "border-violet-500/30 bg-violet-500/10 text-violet-300",
      };
    case "amber":
      return {
        borde: "border-amber-500/20",
        fondo: "bg-amber-500/5",
        badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      };
  }
}

function estadoClasses(estado: OrganigramaEstado) {
  switch (estado) {
    case "estable":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "atencion":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "critico":
      return "border-red-500/30 bg-red-500/10 text-red-300";
  }
}

function cargaClasses(carga: OrganigramaCarga) {
  switch (carga) {
    case "baja":
      return "border-slate-700 bg-slate-950 text-slate-300";
    case "media":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "alta":
      return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }
}

function contextoClasses(estado: OrganigramaEstadoContexto) {
  switch (estado) {
    case "incidencia":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "normal":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
}

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function tramoFlujoClasses(args: { activo: boolean; incidencias: number }) {
  if (!args.activo) {
    return "border-slate-800/70 bg-slate-950/40 opacity-85";
  }

  if (args.incidencias > 0) {
    return "border-amber-400/45 bg-amber-500/14 shadow-sm shadow-amber-950/20";
  }

  return "border-sky-400/45 bg-sky-500/14 shadow-sm shadow-sky-950/20";
}

type Props = {
  organigrama: OrganigramaReadModel;
};

export default function OrganigramaHorizontal({ organigrama }: Props) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-slate-100">Organigrama horizontal</h2>
        <p className="mt-1 text-xs text-slate-400">
          Estructura de coordinación por macroárea con carga, bloqueo y movimiento real.
          Los submódulos muestran mapa operativo disponible, no ejecución real por caso.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950 px-4 py-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
              Flujo del caso
            </p>
            <p className="mt-1.5 text-sm text-slate-300">
              {organigrama.flujo.descripcion}
            </p>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-400">
            Lectura principal del recorrido
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[1120px] items-stretch gap-2.5">
            {organigrama.flujo.tramos.map((tramo, index) => {
              const estilos = colorClasses(tramo.responsable_color);
              const tramoActivo = tramo.total_casos > 0;

              return (
                <div key={tramo.key} className="flex min-w-[170px] flex-1 items-stretch gap-2">
                  <div
                    className={`flex-1 rounded-lg border p-3 transition-colors ${tramoFlujoClasses({
                      activo: tramoActivo,
                      incidencias: tramo.incidencias,
                    })}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Tramo del flujo
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-100">
                          {tramo.label}
                        </p>
                      </div>
                      {tramoActivo ? (
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-200">
                          Activo
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      Responsable del tramo
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-300">
                      {tramo.responsable_label}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${estilos.badge}`}>
                        {tramo.total_casos} caso(s)
                      </span>
                      {tramo.incidencias > 0 ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                          {tramo.incidencias} incidencia(s)
                        </span>
                      ) : (
                        <span className="rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
                          Sin incidencias visibles
                        </span>
                      )}
                    </div>

                    {tramo.foco_actual ? (
                      <div className="mt-3 rounded-md border border-slate-800 bg-slate-950 px-2.5 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">
                          Foco visible
                        </p>
                        <p className="mt-1 text-xs text-slate-200">
                          {tramo.foco_actual.cliente}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {tramo.foco_actual.accion_actual}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] text-slate-500">
                        Sin casos activos en este tramo.
                      </p>
                    )}
                  </div>

                  {index < organigrama.flujo.tramos.length - 1 ? (
                    <div className="flex items-center text-slate-600">→</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
          <p className="text-[11px] text-slate-500">Casos mapeados</p>
          <p className="text-sm font-medium text-slate-200">
            {organigrama.resumen.total_casos}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-2">
          <p className="text-[11px] text-red-300/70">Bloqueos detectados</p>
          <p className="text-sm font-medium text-red-300">
            {organigrama.resumen.bloqueados}
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
          <p className="text-[11px] text-amber-300/70">Vencimientos</p>
          <p className="text-sm font-medium text-amber-300">
            {organigrama.resumen.vencidos}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-center shadow-sm">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Nivel 1</p>
          <p className="mt-1.5 text-sm font-semibold text-slate-100">
            {organigrama.direccion}
          </p>
        </div>

        <div className="my-3 h-6 w-px bg-slate-700" />

        <div className="w-full overflow-x-auto">
          <div className="mx-auto min-w-[1120px]">
            <div className="mb-3 h-px w-full bg-slate-700" />

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${organigrama.macroareas.length}, minmax(0, 1fr))`,
              }}
            >
              {organigrama.macroareas.map((area) => {
                const estilos = colorClasses(area.color);

                return (
                  <div key={area.key} className="flex flex-col items-center">
                    <div className="mb-3 h-6 w-px bg-slate-700" />

                    <div className={`w-full rounded-xl border p-3 shadow-sm ${estilos.borde} ${estilos.fondo}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Responsable actual
                          </p>
                          <p className="mt-1.5 text-sm font-semibold text-slate-100">
                            {area.label}
                          </p>
                        </div>

                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${estilos.badge}`}>
                          {area.responsable}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-slate-300">{area.descripcion}</p>

                      {area.foco_actual ? (
                        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                                Etapa actual
                              </p>
                              <p className="mt-1 text-sm font-medium text-slate-100">
                                {area.foco_actual.etapa_label}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] ${contextoClasses(
                                area.foco_actual.estado_contexto
                              )}`}
                            >
                              {area.foco_actual.estado_contexto_label}
                            </span>
                          </div>
                          <p className="mt-3 text-[11px] uppercase tracking-wide text-slate-500">
                            Acción en curso
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            {area.foco_actual.accion_actual}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/40 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">
                            Etapa actual
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Sin fase activa visible en esta macroárea.
                          </p>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${estadoClasses(area.estado)}`}
                        >
                          estado: {formatearTexto(area.estado)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${cargaClasses(area.carga)}`}
                        >
                          carga: {formatearTexto(area.carga)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${
                            area.delegacion === "alta"
                              ? "border-red-500/30 bg-red-500/10 text-red-300"
                              : area.delegacion === "media"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          }`}
                        >
                          delegación: {formatearTexto(area.delegacion)}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-slate-400">{area.detalle}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{area.movimiento}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{area.delegacion_motivo}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={area.cola_href}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                        >
                          Ver cola filtrada
                        </Link>
                        <Link
                          href={area.area_href}
                          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
                        >
                          Ver módulo de área
                        </Link>
                      </div>
                    </div>

                    <div className="my-3 h-5 w-px bg-slate-700" />

                    <div className="w-full space-y-2">
                      {area.submodulos.map((item) => (
                        <div
                          key={item.key}
                          className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-slate-300">{item.label}</p>
                            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-300">
                              {item.estado_label}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">{item.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
