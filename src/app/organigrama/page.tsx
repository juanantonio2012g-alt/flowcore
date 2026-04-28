import Link from "next/link";
import { getOrganigramaReadModel } from "@/core/application/organigrama";
import OrganigramaHorizontal from "@/components/organigrama/organigrama-horizontal";

export const dynamic = "force-dynamic";

export default async function OrganigramaPage() {
  let organigrama;

  try {
    organigrama = await getOrganigramaReadModel();
  } catch {
    return (
      <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
        <div className="flex w-full flex-col gap-3">
          <section className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h1 className="text-base font-semibold text-slate-100">Organigrama</h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  Estructura organizacional con lectura complementaria del flujo real del caso.
                </p>
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-sm text-red-300">No se pudo cargar el organigrama operativo.</p>
          </section>
        </div>
      </main>
    );
  }

  const lecturaDegradada =
    organigrama.metadata.origen === "core.application.organigrama.fallback";

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="flex w-full flex-col gap-3">
        <section className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-slate-100">Organigrama</h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Estructura organizacional con lectura complementaria del flujo real del caso.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Volver al dashboard
              </Link>
              <Link
                href="/areas/operaciones"
                className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
              >
                Ir a áreas
              </Link>
            </div>
          </div>
        </section>

        {lecturaDegradada ? (
          <section className="rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-amber-200/75">
              Lectura estructural degradada
            </p>
            <h2 className="mt-2 text-base font-semibold text-amber-50">
              El mapa cargó sin casos por una falla transitoria de lectura
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-100/75">
              OpenCore mantuvo visible la estructura operativa y el flujo base, pero no pudo
              recuperar los casos normalizados en este intento. Puedes recargar para volver a
              consultar el estado real.
            </p>
          </section>
        ) : null}

        <OrganigramaHorizontal organigrama={organigrama} />
      </div>
    </main>
  );
}
