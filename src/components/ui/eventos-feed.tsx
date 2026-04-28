import Link from "next/link";
import { EventoBase } from "@/lib/eventos/casos";
import { formatearFecha } from "@/lib/fecha";
import { resumirTaxonomiaAlerta } from "@/lib/domain/casos";

type Props = {
  titulo: string;
  descripcion: string;
  eventos: EventoBase[];
  mostrarCaso?: boolean;
  compact?: boolean;
  maxHeightClassName?: string;
  className?: string;
  bodyClassName?: string;
};

function badgeNivel(nivel: EventoBase["nivel"]) {
  switch (nivel) {
    case "critical":
      return "border-red-500/30 bg-red-50 text-red-700";
    case "warning":
      return "border-amber-500/30 bg-amber-50 text-amber-700";
    default:
      return "border-[color:var(--line)] bg-white text-slate-700";
  }
}

export default function EventosFeed({
  titulo,
  descripcion,
  eventos,
  mostrarCaso = true,
  compact = false,
  maxHeightClassName,
  className,
  bodyClassName,
}: Props) {
  return (
    <section
      className={[
        "rounded-2xl border border-[color:var(--line)] bg-white shadow-[0_14px_28px_rgba(17,33,43,0.05)]",
        className ?? "",
      ].join(" ")}
    >
      <div
        className={[
          "border-b border-[color:var(--line)]",
          compact ? "px-3 py-2" : "px-4 py-3",
        ].join(" ")}
      >
        <h2 className={compact ? "text-sm font-semibold text-slate-900" : "text-base font-semibold text-slate-900"}>
          {titulo}
        </h2>
        <p className={compact ? "mt-0.5 text-[11px] text-slate-500" : "mt-0.5 text-xs text-slate-500"}>
          {descripcion}
        </p>
      </div>

      <div
        className={[
          compact ? "space-y-1.5 p-3" : "space-y-2 p-4",
          maxHeightClassName ?? "",
          maxHeightClassName ? "overflow-y-auto" : "",
          bodyClassName ?? "",
        ].join(" ")}
      >
        {eventos.length === 0 ? (
          <p className="text-sm text-slate-500">No hay eventos para mostrar.</p>
        ) : (
          eventos.map((evento, index) => (
            <div
              key={`${evento.tipo}-${evento.casoId}-${index}`}
              className={compact
                ? "rounded-lg border border-[color:var(--line)] bg-slate-50 p-2.5"
                : "rounded-xl border border-[color:var(--line)] bg-slate-50 p-3"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{evento.titulo}</p>
                  <p className={compact ? "mt-0.5 truncate text-[11px] text-slate-500" : "mt-0.5 text-xs text-slate-500"}>
                    {evento.detalle}
                  </p>
                  {evento.taxonomia ? (
                    <p className={compact ? "mt-1 text-[10px] text-slate-500" : "mt-1 text-[11px] text-slate-500"}>
                      {resumirTaxonomiaAlerta(evento.taxonomia)}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`rounded-full border ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"} ${badgeNivel(
                    evento.nivel
                  )}`}
                >
                  {evento.nivel === "critical"
                    ? "Crítico"
                    : evento.nivel === "warning"
                    ? "Atención"
                    : "Info"}
                </span>
              </div>

              <div className={compact ? "mt-1.5 flex flex-wrap items-center justify-between gap-3" : "mt-2 flex flex-wrap items-center justify-between gap-3"}>
                <p className={compact ? "text-[10px] text-slate-500" : "text-[11px] text-slate-500"}>
                  {formatearFecha(evento.fecha)}
                </p>

                {mostrarCaso && (
                  <Link
                    href={`/casos/${evento.casoId}`}
                    className={compact ? "text-[10px] text-slate-700 hover:underline" : "text-[11px] text-slate-700 hover:underline"}
                  >
                    Abrir caso
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
