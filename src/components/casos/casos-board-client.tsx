"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CasoWorklistItem } from "@/core/application/casos";
import { inicialesResponsableOperativo } from "@/core/domain/casos/responsabilidad-operativa";

type Props = {
  casos: CasoWorklistItem[];
  totalCasos: number;
  busquedaInicial?: string;
};

type EstadoVista = "todos" | "abierto" | "en_progreso" | "en_revision" | "cerrado";
type PrioridadVista = "todas" | "alta" | "media" | "baja";
type ResponsableVista = {
  filtro: string;
  iniciales: string;
  nombre: string;
  detalle: string;
};
type CasoBoardRow = {
  id: string;
  href: string;
  titulo: string;
  etiqueta: string;
  cliente: string;
  estado: Exclude<EstadoVista, "todos">;
  prioridad: Exclude<PrioridadVista, "todas">;
  responsable: ResponsableVista;
  actualizado: string;
};

function estadoVista(caso: CasoWorklistItem): Exclude<EstadoVista, "todos"> {
  if (
    caso.workflow_estado === "cerrado" ||
    caso.estado === "aprobado" ||
    caso.estado === "rechazado"
  ) {
    return "cerrado";
  }

  if (caso.validacion_pendiente || caso.requiere_validacion || caso.estado === "validacion") {
    return "en_revision";
  }

  if (
    caso.estado === "diagnostico" ||
    caso.estado === "cotizacion" ||
    caso.estado === "seguimiento" ||
    caso.estado_comercial_real === "en_proceso" ||
    caso.estado_comercial_real === "negociacion"
  ) {
    return "en_progreso";
  }

  return "abierto";
}

function prioridadVista(prioridad: string | null): Exclude<PrioridadVista, "todas"> {
  if (prioridad === "urgente" || prioridad === "alta") return "alta";
  if (prioridad === "media") return "media";
  if (prioridad === "baja") return "baja";
  return "media";
}

function etiquetaCaso(caso: CasoWorklistItem) {
  if (caso.macroarea_actual === "comercial") return "Contrato";
  if (caso.macroarea_actual === "tecnico") return "Reclamo";
  if (caso.macroarea_actual === "administracion") return "Administrativo";
  return "Legal";
}

function responsableCaso(caso: CasoWorklistItem) {
  const humano = caso.responsable_humano;
  const nombre = caso.responsable_humano_label;
  const detalle = `${caso.macroarea_label} · ${caso.agente_operativo_activo}`;

  return {
    filtro: humano ?? "sin_asignar",
    iniciales: inicialesResponsableOperativo(nombre),
    nombre,
    detalle,
  };
}

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tituloEstado(estado: EstadoVista) {
  if (estado === "abierto") return "Abierto";
  if (estado === "en_progreso") return "En progreso";
  if (estado === "en_revision") return "En revisión";
  if (estado === "cerrado") return "Cerrado";
  return "Todos";
}

function tituloPrioridad(prioridad: PrioridadVista) {
  if (prioridad === "alta") return "Alta";
  if (prioridad === "media") return "Media";
  if (prioridad === "baja") return "Baja";
  return "Todas";
}

function estadoClassName(estado: EstadoVista) {
  if (estado === "abierto") return "bg-[#eaf7ee] text-[#2f8a4f]";
  if (estado === "en_progreso") return "bg-[#fff4dc] text-[#b77700]";
  if (estado === "en_revision") return "bg-[#f0eaff] text-[#6f4bd8]";
  if (estado === "cerrado") return "bg-[#edf0f4] text-[#6d7683]";
  return "bg-slate-100 text-slate-600";
}

function prioridadClassName(prioridad: PrioridadVista) {
  if (prioridad === "alta") return "bg-[#fdecec] text-[#de3b3b]";
  if (prioridad === "media") return "bg-[#fff4dc] text-[#b77700]";
  if (prioridad === "baja") return "bg-[#eaf2ff] text-[#1d6fe8]";
  return "bg-slate-100 text-slate-600";
}

function etiquetaClassName(etiqueta: string) {
  if (etiqueta === "Contrato") return "bg-[#e9f1ff] text-[#2563eb]";
  if (etiqueta === "Legal") return "bg-[#f2edff] text-[#7048d8]";
  if (etiqueta === "Reclamo") return "bg-[#fff0e6] text-[#db6a1d]";
  if (etiqueta === "Administrativo") return "bg-[#e8fbff] text-[#0a8794]";
  if (etiqueta === "Negociación") return "bg-[#ffeaf3] text-[#c93072]";
  return "bg-[#f3f5f8] text-[#536174]";
}

function tiempoRelativo(fecha: string | null) {
  if (!fecha) return "Hace 1 hora";

  const timestamp = new Date(fecha).getTime();
  if (!Number.isFinite(timestamp)) return "Hace 1 hora";

  const diferencia = Date.now() - timestamp;
  const minutos = Math.max(1, Math.floor(diferencia / 60000));
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas} hora${horas === 1 ? "" : "s"}`;
  if (dias === 1) return "Ayer";
  return `Hace ${dias} días`;
}

function casoNumero(caso: CasoWorklistItem, index: number, total: number) {
  const match = caso.id.match(/(20\d{2}[-_]\d{2,})/);
  if (match) return `#${match[1].replace("_", "-")}`;

  const numero = Math.max(total - index, 1);
  return `#2024-${String(numero).padStart(3, "0")}`;
}

function SearchIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      <circle cx="11" cy="11" r="7" />
    </svg>
  );
}

function MetricIcon({ kind }: { kind: "total" | "open" | "progress" | "review" | "closed" }) {
  if (kind === "total") {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 5h5l1.4 2H19v12H5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return <span className="h-3 w-3 rounded-full bg-current" />;
}

function DownloadIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4v10" strokeLinecap="round" />
      <path d="m8 10 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20h14" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14" strokeLinecap="round" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6h16" strokeLinecap="round" />
      <path d="M7 12h10" strokeLinecap="round" />
      <path d="M10 18h4" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m7 10 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      {direction === "left" ? (
        <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function CasosBoardClient({ casos, totalCasos, busquedaInicial = "" }: Props) {
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [estado, setEstado] = useState<EstadoVista>("todos");
  const [prioridad, setPrioridad] = useState<PrioridadVista>("todas");
  const [responsable, setResponsable] = useState("todos");

  const filas = useMemo(() => {
    return casos.map<CasoBoardRow>((caso, index) => {
      const etiqueta = etiquetaCaso(caso);
      return {
        id: casoNumero(caso, index, totalCasos),
        href: `/casos/${caso.id}`,
        titulo: caso.proyecto || caso.recomendacion_accion || "Caso operativo",
        etiqueta,
        cliente: caso.cliente,
        estado: estadoVista(caso),
        prioridad: prioridadVista(caso.prioridad),
        responsable: responsableCaso(caso),
        actualizado: tiempoRelativo(caso.created_at ?? caso.workflow_ultima_transicion_at ?? null),
      };
    });
  }, [casos, totalCasos]);

  const filasFiltradas = useMemo(() => {
    const query = normalizar(busqueda.trim());

    return filas.filter((fila) => {
      const texto = normalizar(
        `${fila.id} ${fila.titulo} ${fila.etiqueta} ${fila.cliente} ${fila.responsable.nombre} ${fila.responsable.detalle}`
      );
      const coincideBusqueda = query === "" || texto.includes(query);
      const coincideEstado = estado === "todos" || fila.estado === estado;
      const coincidePrioridad = prioridad === "todas" || fila.prioridad === prioridad;
      const coincideResponsable =
        responsable === "todos" || fila.responsable.filtro === responsable;

      return coincideBusqueda && coincideEstado && coincidePrioridad && coincideResponsable;
    });
  }, [busqueda, estado, filas, prioridad, responsable]);

  const total = Math.max(totalCasos, filas.length);
  const abiertos = filas.filter((fila) => fila.estado === "abierto").length;
  const enProgreso = filas.filter((fila) => fila.estado === "en_progreso").length;
  const enRevision = filas.filter((fila) => fila.estado === "en_revision").length;
  const cerrados = filas.filter((fila) => fila.estado === "cerrado").length;
  const inicioMostrado = filasFiltradas.length > 0 ? 1 : 0;
  const finMostrado = Math.min(6, filasFiltradas.length);

  const responsables = Array.from(
    new Map(filas.map((fila) => [fila.responsable.filtro, fila.responsable])).values()
  );

  return (
    <main className="px-5 py-7 xl:px-9 xl:py-8">
      <section className="mx-auto max-w-[1215px]">
        <div>
          <h1 className="text-[34px] font-bold leading-tight text-[#111827]">Casos</h1>
          <p className="mt-2 text-[15.5px] text-[#536174]">
            Gestiona y da seguimiento a todos los casos de la organización.
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:w-[248px]">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#7b8798]">
                <SearchIcon />
              </span>
              <input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#e4e8ef] bg-white px-4 pr-12 text-[14px] text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.02)] outline-none placeholder:text-[#7b8798]"
                placeholder="Buscar casos..."
              />
            </div>

            <label className="relative block w-full lg:w-[104px]">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#536174]">
                <ChevronDown />
              </span>
              <select
                value={estado}
                onChange={(event) => setEstado(event.target.value as EstadoVista)}
                className="h-11 w-full appearance-none rounded-lg border border-[#e4e8ef] bg-white px-4 pr-10 text-[14px] text-[#242b37] outline-none"
                aria-label="Estado"
              >
                <option value="todos">Estado</option>
                <option value="abierto">Abierto</option>
                <option value="en_progreso">En progreso</option>
                <option value="en_revision">En revisión</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </label>

            <label className="relative block w-full lg:w-[116px]">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#536174]">
                <ChevronDown />
              </span>
              <select
                value={prioridad}
                onChange={(event) => setPrioridad(event.target.value as PrioridadVista)}
                className="h-11 w-full appearance-none rounded-lg border border-[#e4e8ef] bg-white px-4 pr-10 text-[14px] text-[#242b37] outline-none"
                aria-label="Prioridad"
              >
                <option value="todas">Prioridad</option>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </label>

            <label className="relative block w-full lg:w-[138px]">
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#536174]">
                <ChevronDown />
              </span>
              <select
                value={responsable}
                onChange={(event) => setResponsable(event.target.value)}
                className="h-11 w-full appearance-none rounded-lg border border-[#e4e8ef] bg-white px-4 pr-10 text-[14px] text-[#242b37] outline-none"
                aria-label="Responsable humano"
              >
                <option value="todos">Responsable humano</option>
                {responsables.map((item) => (
                  <option key={item.filtro} value={item.filtro}>
                    {item.nombre}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e4e8ef] bg-white px-4 text-[14px] font-medium text-[#242b37]"
            >
              <FilterIcon />
              Más filtros
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#e4e8ef] bg-white px-5 text-[14px] font-medium text-[#242b37]"
            >
              <DownloadIcon />
              Exportar
            </button>
            <Link
              href="/casos/nuevo"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-5 text-[14px] font-medium text-white shadow-[0_1px_2px_rgba(37,99,235,0.18)]"
            >
              <PlusIcon />
              Nuevo caso
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total casos", value: total, kind: "total" as const, tone: "text-[#2563eb] bg-[#eef4ff]" },
            { label: "Abiertos", value: abiertos, kind: "open" as const, tone: "text-[#43a35c] bg-[#eef8f1]" },
            { label: "En progreso", value: enProgreso, kind: "progress" as const, tone: "text-[#f1ad21] bg-[#fff7e7]" },
            { label: "En revisión", value: enRevision, kind: "review" as const, tone: "text-[#7254dc] bg-[#f4efff]" },
            { label: "Cerrados", value: cerrados, kind: "closed" as const, tone: "text-[#6b7684] bg-[#f3f5f8]" },
          ].map((metric) => (
            <article
              key={metric.label}
              className="flex min-h-[96px] items-center gap-4 rounded-lg border border-[#e8ebf1] bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.025)]"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${metric.tone}`}>
                <MetricIcon kind={metric.kind} />
              </div>
              <div>
                <p className="text-[26px] font-semibold leading-none text-[#111827]">{metric.value}</p>
                <p className="mt-2 text-[13.5px] text-[#6b7688]">{metric.label}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-7 overflow-hidden rounded-lg border border-[#e6e9ef] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.025)]">
          <div className="overflow-x-auto">
            <table className="min-w-[1040px] w-full border-collapse text-left">
              <thead>
                <tr className="h-12 border-b border-[#e9edf3] text-[13.5px] font-semibold text-[#536174]">
                  <th className="w-[27%] px-6">Caso</th>
                  <th className="w-[17%] px-6">Cliente</th>
                  <th className="w-[12%] px-6">Estado</th>
                  <th className="w-[10%] px-6">Prioridad</th>
                  <th className="w-[16%] px-6">Responsable humano</th>
                  <th className="w-[12%] px-6">Actualizado</th>
                  <th className="w-[6%] px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filasFiltradas.slice(0, 6).map((fila) => (
                  <tr key={fila.id} className="h-20 border-b border-[#edf0f4] last:border-b-0">
                    <td className="px-6">
                      <Link href={fila.href} className="group inline-block">
                        <p className="text-[14.5px] font-semibold text-[#111827] group-hover:text-[#2563eb]">
                          {fila.id}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="max-w-[210px] truncate text-[13.5px] text-[#2f3744]">
                            {fila.titulo}
                          </span>
                          <span
                            className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${etiquetaClassName(
                              fila.etiqueta
                            )}`}
                          >
                            {fila.etiqueta}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 text-[14px] text-[#242b37]">{fila.cliente}</td>
                    <td className="px-6">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-medium ${estadoClassName(fila.estado)}`}>
                        {tituloEstado(fila.estado)}
                      </span>
                    </td>
                    <td className="px-6">
                      <span className={`whitespace-nowrap rounded-full px-3 py-1 text-[12.5px] font-medium ${prioridadClassName(fila.prioridad)}`}>
                        {tituloPrioridad(fila.prioridad)}
                      </span>
                    </td>
                    <td className="px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f7] text-[13px] font-medium text-[#6b7688]">
                          {fila.responsable.iniciales}
                        </span>
                        <span>
                          <span className="block text-[14px] text-[#242b37]">
                            {fila.responsable.nombre}
                          </span>
                          <span className="mt-1 block text-[12px] text-[#6b7688]">
                            {fila.responsable.detalle}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 text-[14px] text-[#6b7688]">{fila.actualizado}</td>
                    <td className="px-6 text-center">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#536174] hover:bg-[#f4f6f9]"
                        aria-label={`Acciones para ${fila.id}`}
                      >
                        ...
                      </button>
                    </td>
                  </tr>
                ))}
                {filasFiltradas.length === 0 ? (
                  <tr className="h-20">
                    <td className="px-6 text-[14px] text-[#536174]" colSpan={7}>
                      No hay casos para mostrar.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#edf0f4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13.5px] text-[#536174]">
              Mostrando {inicioMostrado} a {finMostrado} de {total} casos
            </p>
            {total > 0 ? (
              <div className="flex items-center gap-2">
                <button className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e6e9ef] bg-white text-[#6b7688]">
                  <ArrowIcon direction="left" />
                </button>
                {[1, 2, 3, 4].map((page) => (
                  <button
                    key={page}
                    className={[
                      "flex h-9 w-9 items-center justify-center rounded-md border text-[14px]",
                      page === 1
                        ? "border-[#e8eefc] bg-[#eef4ff] text-[#2563eb]"
                        : "border-[#e6e9ef] bg-white text-[#242b37]",
                    ].join(" ")}
                  >
                    {page}
                  </button>
                ))}
                <button className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e6e9ef] bg-white text-[#6b7688]">
                  <ArrowIcon direction="right" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
