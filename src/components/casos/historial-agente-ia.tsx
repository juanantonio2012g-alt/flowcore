import type { EventosAgenteIAPorCasoReadModel } from "@/core/application/agentes-ia";
import { formatearFecha } from "@/lib/fecha";

type Props = {
  historial: EventosAgenteIAPorCasoReadModel | null;
  error?: string | null;
};

function formatearTexto(valor: string | null | undefined) {
  if (!valor) return "-";

  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function prioridadClass(prioridad: string) {
  if (prioridad === "alta") return "bg-[#fdecec] text-[#de3b3b]";
  if (prioridad === "media") return "bg-[#fff4dc] text-[#b77700]";
  return "bg-[#e9f1ff] text-[#2563eb]";
}

function supervisionHumanaLabel(valor: boolean | null | undefined) {
  if (valor === null || typeof valor === "undefined") return "-";
  return valor ? "Sí" : "No";
}

export default function HistorialAgenteIA({ historial, error }: Props) {
  return (
    <section className="rounded-lg border border-[#e6e9ef] bg-white px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111827]">Historial IA agent</h2>
          <p className="mt-1 max-w-2xl text-[14px] text-[#6b7688]">
            Lectura histórica separada de la bitácora humana. Refleja solo eventos operativos del
            IA agent asociados al caso.
          </p>
        </div>

        {historial ? (
          <div className="rounded-lg border border-[#e6e9ef] bg-[#f8fafc] px-3 py-2 text-right">
            <p className="text-[12px] font-medium text-[#536174]">
              {historial.total} evento{historial.total === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-[11.5px] text-[#6b7688]">
              Generado {formatearFecha(historial.generated_at)}
            </p>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-lg border border-[#fde2e2] bg-[#fff7f7] px-4 py-3">
          <p className="text-[13px] font-medium text-[#b42318]">
            No se pudo cargar el historial del IA agent.
          </p>
          <p className="mt-1 text-[12.5px] text-[#9f1f1f]">{error}</p>
        </div>
      ) : null}

      {!error && historial?.eventos.length === 0 ? (
        <p className="mt-5 text-[14px] text-[#6b7688]">
          No hay eventos históricos del IA agent para este caso todavía.
        </p>
      ) : null}

      {!error && historial && historial.eventos.length > 0 ? (
        <div className="mt-5 space-y-4">
          {historial.eventos.map((evento, index) => (
            <article
              key={`${evento.agente_ia_codigo}-${evento.created_at}-${index}`}
              className="rounded-lg border border-[#e6e9ef] bg-[#fbfcfe] px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#edf0f4] px-2.5 py-1 text-[11px] font-medium text-[#536174]">
                      {formatearTexto(evento.tipo_de_input)}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-[11px] font-medium",
                        prioridadClass(evento.prioridad_operativa),
                      ].join(" ")}
                    >
                      Prioridad {formatearTexto(evento.prioridad_operativa)}
                    </span>
                    <span className="rounded-full bg-[#e8fbff] px-2.5 py-1 text-[11px] font-medium text-[#0a8794]">
                      {evento.source}
                    </span>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-[#111827]">
                    {evento.sugerencia_operativa.resumen}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-[#4c596a]">
                    {evento.sugerencia_operativa.motivo}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[12px] font-medium text-[#536174]">
                    {evento.agente_ia_codigo}
                  </p>
                  <p className="mt-1 text-[11.5px] text-[#6b7688]">
                    {formatearFecha(evento.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a94a6]">
                    Agente IA ID
                  </p>
                  <p className="mt-1 break-all text-[13px] text-[#242b37]">{evento.agente_ia_id}</p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a94a6]">
                    Acción recomendada
                  </p>
                  <p className="mt-1 text-[13px] text-[#242b37]">
                    {evento.accion_recomendada_opcional || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a94a6]">
                    Supervisión humana
                  </p>
                  <p className="mt-1 text-[13px] text-[#242b37]">
                    {supervisionHumanaLabel(
                      evento.sugerencia_operativa.requiere_supervision_humana
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a94a6]">
                    Fecha sugerida
                  </p>
                  <p className="mt-1 text-[13px] text-[#242b37]">
                    {evento.sugerencia_operativa.fecha_sugerida || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8a94a6]">
                  Señales detectadas
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {evento.señales_detectadas.length > 0 ? (
                    evento.señales_detectadas.map((senal) => (
                      <span
                        key={senal}
                        className="rounded-full bg-[#edf0f4] px-2.5 py-1 text-[11px] text-[#536174]"
                      >
                        {senal}
                      </span>
                    ))
                  ) : (
                    <span className="text-[13px] text-[#6b7688]">-</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

