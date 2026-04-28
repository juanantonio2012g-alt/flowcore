import Link from "next/link";
import { getClientesReadModel } from "@/core/application/clientes";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function badgeRelacional(
  valor: string,
  tipo: "friccion" | "conversion"
) {
  const base = "rounded-full border px-2 py-0.5 text-[10px]";
  const normalizado = valor.trim().toLowerCase();

  if (tipo === "friccion") {
    if (normalizado === "alto" || normalizado === "alta") {
      return `${base} border-red-500/30 bg-red-50 text-red-700`;
    }
    if (normalizado === "medio" || normalizado === "media") {
      return `${base} border-amber-500/30 bg-amber-50 text-amber-700`;
    }
    if (normalizado === "bajo" || normalizado === "baja") {
      return `${base} border-emerald-500/30 bg-emerald-50 text-emerald-700`;
    }
  }

  if (tipo === "conversion") {
    if (normalizado === "alto" || normalizado === "alta") {
      return `${base} border-emerald-500/30 bg-emerald-50 text-emerald-700`;
    }
    if (normalizado === "medio" || normalizado === "media") {
      return `${base} border-amber-500/30 bg-amber-50 text-amber-700`;
    }
    if (normalizado === "bajo" || normalizado === "baja") {
      return `${base} border-red-500/30 bg-red-50 text-red-700`;
    }
  }

  return `${base} border-[color:var(--line)] bg-white text-slate-600`;
}

function badgeContexto(estado: "normal" | "incidencia") {
  const base = "rounded-full border px-2 py-0.5 text-[10px]";
  return estado === "incidencia"
    ? `${base} border-red-500/30 bg-red-50 text-red-700`
    : `${base} border-emerald-500/30 bg-emerald-50 text-emerald-700`;
}

function valorPlano(valor: string | string[] | undefined) {
  if (Array.isArray(valor)) return valor[0] ?? "";
  return valor ?? "";
}

function normalizarNivel(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim().toLowerCase();
  if (limpio === "alta") return "alto";
  if (limpio === "media") return "medio";
  if (limpio === "baja") return "bajo";
  if (limpio === "alto" || limpio === "medio" || limpio === "bajo") return limpio;
  return "";
}

export default async function ClientesPage({ searchParams }: Props) {
  const filtros = (await searchParams) ?? {};
  const termino = valorPlano(filtros.q).trim().toLowerCase();
  const filtrarActivos = valorPlano(filtros.activos) === "1";
  const filtrarRiesgo = valorPlano(filtros.riesgo) === "1";
  const filtrarFriccion = normalizarNivel(valorPlano(filtros.friccion));
  const filtrarConversion = normalizarNivel(valorPlano(filtros.conversion));
  const minCasos = Number.parseInt(valorPlano(filtros.minCasos) || "0", 10);
  const minCasosSeguro = Number.isFinite(minCasos) && minCasos > 0 ? minCasos : 0;

  let clientes;

  try {
    clientes = await getClientesReadModel();
  } catch {
    return (
      <main className="h-full overflow-auto px-4 py-5 text-slate-900 xl:px-8 xl:py-6">
        <div className="w-full">
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="mt-4 text-red-500">No se pudieron cargar los clientes.</p>
        </div>
      </main>
    );
  }

  const clientesFiltrados = clientes.items.filter((cliente) => {
    const coincideTexto =
      !termino ||
      cliente.nombre.toLowerCase().includes(termino) ||
      cliente.empresa.toLowerCase().includes(termino);
    const coincideActivos = !filtrarActivos || cliente.casos_activos > 0;
    const coincideRiesgo = !filtrarRiesgo || cliente.casos_riesgo > 0;
    const coincideFriccion =
      !filtrarFriccion || normalizarNivel(cliente.friccion) === filtrarFriccion;
    const coincideConversion =
      !filtrarConversion || normalizarNivel(cliente.conversion) === filtrarConversion;
    const coincideCasos = cliente.total_casos >= minCasosSeguro;

    return (
      coincideTexto &&
      coincideActivos &&
      coincideRiesgo &&
      coincideFriccion &&
      coincideConversion &&
      coincideCasos
    );
  });

  return (
    <main className="h-full overflow-auto px-4 py-5 text-slate-900 xl:px-8 xl:py-6">
      <div className="w-full space-y-4">
        <section className="oc-hero-band px-6 py-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3 py-1.5">
                <span className="oc-topline-dot" />
                <p className="oc-label">OpenCore Clients</p>
              </div>
              <h1 className="mt-5 text-3xl font-bold leading-tight text-slate-900 xl:text-[2.4rem]">
                Clientes
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Carga, riesgo, fricción, conversión y ownership operativo en una sola vista.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className="oc-button-secondary">
                Volver al dashboard
              </Link>
              <Link href="/casos" className="oc-button-secondary">
                Ir a casos
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="oc-card-soft px-4 py-4">
            <p className="oc-label">Total de clientes</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-900">
              {clientes.resumen.total}
            </p>
          </article>
          <article className="oc-card-soft border-emerald-500/20 bg-emerald-50 px-4 py-4 text-emerald-700">
            <p className="oc-label !text-emerald-700/80">Clientes con casos activos</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {clientes.resumen.con_casos_activos}
            </p>
          </article>
          <article className="oc-card-soft border-red-500/20 bg-red-50 px-4 py-4 text-red-700">
            <p className="oc-label !text-red-700/80">Clientes con casos en riesgo</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {clientes.resumen.con_riesgo}
            </p>
          </article>
          <article className="oc-card-soft border-amber-500/20 bg-amber-50 px-4 py-4 text-amber-700">
            <p className="oc-label !text-amber-700/80">Clientes con fricción alta</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              {clientes.resumen.con_friccion_alta}
            </p>
          </article>
        </section>

        <section className="oc-card">
          <form className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6 xl:p-5">
            <label className="xl:col-span-2">
              <span className="mb-1 block text-xs text-slate-400">Nombre o empresa</span>
              <input
                type="search"
                name="q"
                defaultValue={valorPlano(filtros.q)}
                placeholder="Buscar cliente..."
                className="oc-input"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Con casos activos</span>
              <select
                name="activos"
                defaultValue={valorPlano(filtros.activos)}
                className="oc-input"
              >
                <option value="">Todos</option>
                <option value="1">Solo activos</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Con riesgo</span>
              <select
                name="riesgo"
                defaultValue={valorPlano(filtros.riesgo)}
                className="oc-input"
              >
                <option value="">Todos</option>
                <option value="1">Solo con riesgo</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Fricción</span>
              <select
                name="friccion"
                defaultValue={valorPlano(filtros.friccion)}
                className="oc-input"
              >
                <option value="">Todas</option>
                <option value="alto">Alta</option>
                <option value="medio">Media</option>
                <option value="bajo">Baja</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Conversión</span>
              <select
                name="conversion"
                defaultValue={valorPlano(filtros.conversion)}
                className="oc-input"
              >
                <option value="">Todas</option>
                <option value="alto">Alta</option>
                <option value="medio">Media</option>
                <option value="bajo">Baja</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-slate-400">Mínimo de casos</span>
              <select
                name="minCasos"
                defaultValue={valorPlano(filtros.minCasos)}
                className="oc-input"
              >
                <option value="">Sin mínimo</option>
                <option value="1">1+</option>
                <option value="3">3+</option>
                <option value="5">5+</option>
                <option value="10">10+</option>
              </select>
            </label>
            <div className="flex items-end gap-2 xl:col-span-6">
              <button type="submit" className="oc-button">
                Aplicar filtros
              </button>
              <Link href="/clientes" className="oc-button-secondary">
                Limpiar
              </Link>
            </div>
          </form>
        </section>

        <section className="oc-card">
          <header className="flex flex-wrap items-end justify-between gap-2 border-b border-[color:var(--line)] px-4 py-4 xl:px-5">
            <div>
              <p className="oc-label">Mapa de clientes</p>
              <h2 className="mt-2 text-[1.55rem] font-semibold tracking-[-0.04em] text-slate-900">
                Vista relacional priorizada por carga y oportunidad
              </h2>
              <p className="mt-2 text-xs text-slate-500">
                Lista relacional priorizada por carga, riesgo, fricción y conversión.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Mostrando <span className="text-slate-900">{clientesFiltrados.length}</span> de{" "}
              <span className="text-slate-900">{clientes.resumen.total}</span> clientes
            </p>
          </header>

          <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(220px,2fr)_100px_100px_100px_120px_120px_100px_140px] gap-3 border-b border-[color:var(--line)] px-4 py-2 text-[11px] uppercase tracking-wide text-slate-500 xl:grid">
            <span>Cliente</span>
            <span>Empresa</span>
            <span className="text-right">Casos</span>
            <span className="text-right">Activos</span>
            <span className="text-right">Riesgo</span>
            <span>Fricción</span>
            <span>Conversión</span>
            <span className="text-right">Índice</span>
            <span className="text-right">Acceso</span>
          </div>

          <div className="divide-y divide-[color:var(--line)]">
            {clientesFiltrados.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">
                No hay clientes para mostrar.
              </div>
            ) : (
              clientesFiltrados.map((cliente) => (
                <Link
                  key={cliente.id}
                  href={`/clientes/${cliente.id}`}
                  className="block px-4 py-4 transition hover:bg-slate-50"
                >
                  <div className="space-y-3 xl:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{cliente.nombre}</p>
                        <p className="text-xs text-slate-400">{cliente.empresa}</p>
                      </div>
                      <p className="rounded-md border border-[color:var(--line)] px-2 py-1 text-xs text-slate-700">
                        índice {cliente.indice_atencion}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                      <p>
                        Casos <span className="text-slate-900">{cliente.total_casos}</span>
                      </p>
                      <p>
                        Activos <span className="text-slate-900">{cliente.casos_activos}</span>
                      </p>
                      <p>
                        Riesgo <span className="text-slate-900">{cliente.casos_riesgo}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={badgeRelacional(cliente.friccion, "friccion")}>
                        Fricción: {cliente.friccion}
                      </span>
                      <span className={badgeRelacional(cliente.conversion, "conversion")}>
                        Conversión: {cliente.conversion}
                      </span>
                      {cliente.foco_operativo ? (
                        <span className={badgeContexto(cliente.foco_operativo.semantica.estado_contexto)}>
                          {cliente.foco_operativo.semantica.estado_contexto_label}
                        </span>
                      ) : null}
                    </div>
                    {cliente.foco_operativo ? (
                      <div className="rounded-lg border border-[color:var(--line)] bg-slate-50 p-3 text-xs text-slate-700">
                        <p>
                          Responsable:{" "}
                          <span className="text-slate-900">
                            {cliente.foco_operativo.ownership_operativo}
                          </span>
                        </p>
                        <p className="mt-1">
                          Etapa:{" "}
                          <span className="text-slate-900">
                            {cliente.foco_operativo.semantica.etapa_label}
                          </span>
                        </p>
                        <p className="mt-1">
                          Acción:{" "}
                          <span className="text-slate-900">
                            {cliente.foco_operativo.semantica.accion_actual}
                          </span>
                        </p>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="ml-auto text-xs font-medium text-slate-700">
                        Abrir cliente
                      </span>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(220px,2fr)_100px_100px_100px_120px_120px_100px_140px] items-center gap-3 xl:grid">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{cliente.nombre}</p>
                      {cliente.foco_operativo ? (
                        <div className="mt-1.5 space-y-1 text-[11px] text-slate-400">
                          <p>
                            Responsable:{" "}
                            <span className="text-slate-900">
                              {cliente.foco_operativo.ownership_operativo}
                            </span>
                          </p>
                          <p>
                            Etapa:{" "}
                            <span className="text-slate-900">
                              {cliente.foco_operativo.semantica.etapa_label}
                            </span>
                          </p>
                          <p className="truncate">
                            Acción:{" "}
                            <span className="text-slate-900">
                              {cliente.foco_operativo.semantica.accion_actual}
                            </span>
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-slate-400">{cliente.empresa}</p>
                    <p className="text-right text-sm text-slate-700">{cliente.total_casos}</p>
                    <p className="text-right text-sm text-slate-700">{cliente.casos_activos}</p>
                    <p className="text-right text-sm text-slate-700">{cliente.casos_riesgo}</p>
                    <span className={badgeRelacional(cliente.friccion, "friccion")}>
                      {cliente.friccion}
                    </span>
                    <span className={badgeRelacional(cliente.conversion, "conversion")}>
                      {cliente.conversion}
                    </span>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{cliente.indice_atencion}</p>
                      {cliente.foco_operativo ? (
                        <span
                          className={`${badgeContexto(
                            cliente.foco_operativo.semantica.estado_contexto
                          )} mt-1 inline-flex`}
                        >
                          {cliente.foco_operativo.semantica.estado_contexto_label}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <span className="rounded-lg border border-[color:var(--line)] px-2 py-1 text-xs text-slate-700">
                        Ver /clientes/{cliente.id}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
