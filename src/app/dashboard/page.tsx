import Link from "next/link";
import { getDashboardReadModel } from "@/core/application/dashboard";
import { formatearFechaCorta } from "@/lib/fecha";

export const dynamic = "force-dynamic";

function MetricIcon({ type }: { type: "case" | "client" | "task" | "report" }) {
  const common = {
    className: "h-7 w-7",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (type === "case") {
    return (
      <svg {...common}>
        <path d="M5 8.5h14v10H5z" />
        <path d="M8 8.5V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2.5" />
      </svg>
    );
  }

  if (type === "client") {
    return (
      <svg {...common}>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      </svg>
    );
  }

  if (type === "task") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12.2 2.1 2.1 4.9-5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 19V9" />
      <path d="M10 19v-5" />
      <path d="M15 19V6" />
      <path d="M20 19v-9" />
      <path d="M4 19h17" />
    </svg>
  );
}

function ActivityIcon({ tone }: { tone: "blue" | "green" | "purple" | "amber" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClass}`}>
      <MetricIcon type={tone === "green" ? "client" : tone === "purple" ? "task" : tone === "amber" ? "report" : "case"} />
    </div>
  );
}

export default async function DashboardPage() {
  let dashboard;

  try {
    dashboard = await getDashboardReadModel();
  } catch (error) {
    console.error("dashboard_load_error", error);
    return (
      <main className="h-full overflow-auto px-8 py-8 text-slate-900">
        <h1 className="text-3xl font-semibold text-slate-900">Inicio</h1>
        <p className="mt-3 text-sm text-red-500">No se pudo cargar el panel operativo.</p>
      </main>
    );
  }

  const foco = dashboard.foco.slice(0, 4);
  const clientesActivos = dashboard.clientes.length;
  const reportes = Math.max(1, dashboard.macroareas.length + 1);
  const chartValues = [
    Math.max(3, Math.round(dashboard.resumen.activos * 0.18)),
    Math.max(8, Math.round(dashboard.resumen.activos * 0.28)),
    Math.max(13, Math.round(dashboard.resumen.activos * 0.4)),
    Math.max(18, Math.round(dashboard.resumen.activos * 0.56)),
  ];
  const chartPoints = chartValues
    .map((value, index) => {
      const x = 24 + index * 120;
      const y = 145 - Math.min(120, value * 3.2);
      return `${x},${y}`;
    })
    .join(" ");

  const metrics = [
    {
      label: "Casos activos",
      value: dashboard.resumen.activos,
      href: "/casos",
      cta: "Ver casos",
      icon: "case" as const,
      tone: "bg-blue-50 text-blue-600",
    },
    {
      label: "Clientes",
      value: clientesActivos,
      href: "/clientes",
      cta: "Ver clientes",
      icon: "client" as const,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Tareas pendientes",
      value: dashboard.resumen.validaciones_pendientes,
      href: "/casos",
      cta: "Ver tareas",
      icon: "task" as const,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Reportes",
      value: reportes,
      href: "/dashboard",
      cta: "Ver reportes",
      icon: "report" as const,
      tone: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <main className="h-full overflow-auto px-5 py-8 text-slate-900 xl:px-10">
      <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6">
        <section>
          <h1 className="text-[2rem] font-bold leading-tight text-slate-900">
            Bienvenido a OpenCore
          </h1>
          <p className="mt-2 text-[1.05rem] text-slate-600">
            Tu centro de operaciones. Todo lo importante, en un solo lugar.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <article key={metric.label} className="oc-card px-6 py-6">
              <div className="flex items-start gap-5">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}>
                  <MetricIcon type={metric.icon} />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">{metric.label}</p>
                  <p className="mt-3 text-[2.2rem] font-semibold leading-none text-slate-900">
                    {metric.value}
                  </p>
                </div>
              </div>
              <Link href={metric.href} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#2563eb]">
                {metric.cta}
                <span aria-hidden>→</span>
              </Link>
            </article>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <article className="oc-card px-6 py-6">
            <h2 className="text-xl font-bold text-slate-900">Actividad reciente</h2>
            <div className="mt-6 space-y-5">
              {foco.slice(0, 4).map((caso, index) => {
                const tones = ["blue", "green", "purple", "amber"] as const;
                return (
                  <Link
                    key={caso.id}
                    href={`/casos/${caso.id}`}
                    className="flex items-start justify-between gap-4 rounded-lg transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <ActivityIcon tone={tones[index] ?? "blue"} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {caso.cliente}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {caso.semantica.accion_actual}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm text-slate-500">
                      {caso.proxima_fecha ? formatearFechaCorta(caso.proxima_fecha) : "Sin fecha"}
                    </p>
                  </Link>
                );
              })}
            </div>
            <div className="mt-6 border-t border-[color:var(--line)] pt-5">
              <Link href="/casos" className="font-semibold text-[#2563eb]">
                Ver toda la actividad
              </Link>
            </div>
          </article>

          <article className="oc-card px-6 py-6">
            <h2 className="text-xl font-bold text-slate-900">Resumen del mes</h2>
            <div className="mt-6 overflow-hidden">
              <svg className="h-[230px] w-full" viewBox="0 0 420 190" role="img" aria-label="Resumen mensual">
                <path d="M20 150H400" stroke="#e5e7eb" strokeWidth="1" />
                <path d="M20 110H400" stroke="#eef2f7" strokeWidth="1" />
                <path d="M20 70H400" stroke="#eef2f7" strokeWidth="1" />
                <path d="M20 30H400" stroke="#eef2f7" strokeWidth="1" />
                <polyline points={chartPoints} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                {chartPoints.split(" ").map((point) => {
                  const [x, y] = point.split(",");
                  return <circle key={point} cx={x} cy={y} r="4" fill="#2563eb" />;
                })}
                <text x="20" y="170" fill="#64748b" fontSize="12">Semana 1</text>
                <text x="140" y="170" fill="#64748b" fontSize="12">Semana 2</text>
                <text x="260" y="170" fill="#64748b" fontSize="12">Semana 3</text>
                <text x="360" y="170" fill="#64748b" fontSize="12">Semana 4</text>
              </svg>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-600">Casos nuevos</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.max(1, Math.round(dashboard.resumen.activos * 0.24))}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">↑ 20%</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-600">Casos cerrados</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.max(1, dashboard.resumen.delegacion_alta + 5)}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">↑ 15%</p>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-600">Eficiencia</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">85%</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">↑ 10%</p>
              </div>
            </div>
          </article>
        </section>

        <section className="oc-card flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-[#2563eb]">
              ?
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">¿Necesitas ayuda?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consulta la guía rápida o contacta al soporte.
              </p>
            </div>
          </div>
          <Link href="/organigrama" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#eff4ff] px-5 py-3 font-semibold text-[#2563eb]">
            Ir a ayuda
            <span aria-hidden>→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
