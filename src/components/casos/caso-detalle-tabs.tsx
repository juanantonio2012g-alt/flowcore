"use client";

import { useState } from "react";
import type { CasoDetalleNormalizado } from "@/core/domain/casos/detalle";
import { VALIDACION_REQUERIDA_LABEL } from "@/core/domain/casos/labels";
import { derivarModoValidacionDiagnosticoVigente } from "@/core/application/casos/expediente/diagnostico/ui";
import {
  derivarSeguimientoComercial,
  labelEstadoComercialPrincipal,
  labelSenalComercial,
} from "@/core/application/casos/expediente/seguimiento/comercial";
import ValidarDiagnosticoForm from "./validar-diagnostico-form";
import { formatearFecha } from "@/lib/fecha";

type Props = {
  casoId: string;
  expediente: CasoDetalleNormalizado["expediente"];
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function formatearMonto(valor: number | null) {
  if (valor === null) return "-";
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(valor);
}

function listaTexto(items: string[] | null | undefined) {
  if (!items || items.length === 0) return "-";
  return items.join(", ");
}

function estadoLigero(
  valor: boolean | null | undefined,
  positivo = "Si",
  negativo = "No"
) {
  if (valor === null || valor === undefined) return "-";
  return valor ? positivo : negativo;
}

function badgeValidacionDiagnostico(
  resultado: string | null | undefined,
  pendiente: boolean | null | undefined
) {
  if (resultado === "validado") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (resultado === "observado") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (resultado === "rechazado") {
    return "border border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (pendiente) {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  return "border border-slate-700 bg-slate-900 text-slate-300";
}

function badgeModulo(
  estado: "pendiente" | "registrado" | "incompleto" | "estructural",
  activa: boolean
) {
  if (activa) return "bg-slate-900 text-slate-100";
  if (estado === "registrado") {
    return "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (estado === "incompleto") {
    return "border border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  if (estado === "estructural") {
    return "border border-sky-500/30 bg-sky-500/10 text-sky-300";
  }
  return "border border-slate-700 bg-slate-900 text-slate-400";
}

const FORMAL_TABS = [
  { key: "informe", label: "Informe técnico" },
  { key: "evidencia", label: "Evidencia del informe" },
  { key: "diagnostico_humano", label: "Diagnóstico humano" },
  { key: "cotizacion", label: "Cotización" },
  { key: "seguimiento", label: "Seguimiento" },
  { key: "logistica", label: "Logística / entrega" },
  { key: "postventa", label: "Postventa" },
] as const;

const ASSIST_TAB = { key: "agente_ia", label: "Asistencia IA" } as const;

type TabKey = (typeof FORMAL_TABS)[number]["key"] | typeof ASSIST_TAB.key;

export default function CasoDetalleTabs({ casoId, expediente }: Props) {
  const [tabActiva, setTabActiva] = useState<TabKey>(
    expediente.sintesis.pendiente_principal_tab ?? "informe"
  );

  const tabsData = {
    informe: expediente.informe,
    evidencia: expediente.evidencia,
    diagnostico_humano: expediente.diagnostico_humano,
    agente_ia: expediente.agente_ia,
    cotizacion: expediente.cotizacion,
    seguimiento: expediente.seguimiento,
    logistica: expediente.logistica,
    postventa: expediente.postventa,
  } as const;

  const informe = expediente.informe.data;
  const evidencias = expediente.evidencia.data;
  const diagnostico = expediente.diagnostico_humano.data;
  const modoValidacionDiagnostico =
    derivarModoValidacionDiagnosticoVigente(diagnostico);
  const diagnosticoAgente = expediente.agente_ia.data;
  const cotizacion = expediente.cotizacion.data;
  const seguimiento = expediente.seguimiento.data;
  const seguimientoComercial = seguimiento
    ? derivarSeguimientoComercial({
        estadoComercial: seguimiento.estado_comercial,
        senalesComerciales: seguimiento.senales_comerciales,
      })
    : null;
  const logistica = expediente.logistica.data;
  const postventa = expediente.postventa.data;

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
      <div className="border-b border-slate-800 px-4 py-4">
        <h2 className="text-lg font-semibold text-slate-100">Expediente del caso</h2>
        <p className="mt-1 text-sm text-slate-400">
          Distingue registros formales del expediente, soportes documentales y asistencia
          relacionada sin tratarlos como equivalentes.
        </p>
      </div>

      <div className="grid gap-3 border-b border-slate-800 px-4 py-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cobertura formal</p>
          <p className="mt-2 text-sm font-medium text-slate-100">
            {expediente.sintesis.modulos_formales_registrados} de{" "}
            {expediente.sintesis.modulos_formales_totales}
          </p>
          <p className="mt-1 text-xs text-slate-500">{expediente.sintesis.cobertura}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {expediente.sintesis.pendiente_principal_label}
          </p>
          <p className="mt-2 text-sm font-medium text-slate-100">
            {expediente.sintesis.pendiente_principal || "No hay pendiente principal del expediente."}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Asistencia registrada</p>
          <p className="mt-2 text-sm font-medium text-slate-100">
            {expediente.agente_ia.visual.tipo === "registrado" ? "Sí" : "No"}
          </p>
          <p className="mt-1 text-xs text-slate-500">{expediente.sintesis.asistencia_relacionada}</p>
        </div>
      </div>

      <div className="border-b border-slate-800 px-4 py-4">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Registros formales del expediente
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Informe técnico, evidencia documental asociada, diagnóstico humano, cotización, seguimiento,
            logística y postventa como registros formales distintos.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FORMAL_TABS.map((tab) => {
          const activa = tabActiva === tab.key;
          const stat = tabsData[tab.key];
          const esPendientePrincipal = expediente.sintesis.pendiente_principal_tab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabActiva(tab.key)}
              className={[
                "rounded-2xl border p-4 text-left transition",
                activa
                  ? "border-slate-200 bg-slate-100 text-slate-950"
                  : esPendientePrincipal
                    ? "border-amber-500/40 bg-amber-500/10 text-slate-100 hover:border-amber-500/60"
                  : "border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-700",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{tab.label}</p>
                  <p
                    className={[
                      "mt-1 text-xs",
                      activa ? "text-slate-700" : "text-slate-400",
                    ].join(" ")}
                  >
                    {stat.visual.descripcion}
                  </p>
                  <p
                    className={[
                      "mt-1 text-xs",
                      activa ? "text-slate-700/90" : "text-slate-500",
                    ].join(" ")}
                  >
                    {stat.resumen || "-"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={[
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      badgeModulo(stat.visual.tipo, activa),
                    ].join(" ")}
                  >
                    {stat.visual.label}
                  </span>

                  {esPendientePrincipal && !activa ? (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                      Pendiente principal
                    </span>
                  ) : null}

                  {stat.conteo > 0 && (
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px]",
                        activa ? "bg-slate-300 text-slate-900" : "bg-slate-800 text-slate-300",
                      ].join(" ")}
                    >
                      {stat.conteo}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      <div className="border-b border-slate-800 px-4 py-4">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wide text-cyan-300/80">
            Asistencia relacionada
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Soporte complementario para orientar criterio; no equivale a un registro formal del expediente.
          </p>
        </div>
        {(() => {
          const activa = tabActiva === ASSIST_TAB.key;
          const stat = tabsData.agente_ia;

          return (
            <button
              type="button"
              onClick={() => setTabActiva(ASSIST_TAB.key)}
              className={[
                "w-full rounded-2xl border p-4 text-left transition",
                activa
                  ? "border-cyan-200 bg-cyan-50/95 text-slate-950"
                  : "border-slate-800 bg-slate-950 text-slate-100 hover:border-slate-700",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{ASSIST_TAB.label}</p>
                  <p
                    className={[
                      "mt-1 text-xs",
                      activa ? "text-slate-700" : "text-slate-400",
                    ].join(" ")}
                  >
                    {stat.visual.descripcion}
                  </p>
                  <p
                    className={[
                      "mt-1 text-xs",
                      activa ? "text-slate-700/90" : "text-slate-500",
                    ].join(" ")}
                  >
                    {stat.resumen || "-"}
                  </p>
                </div>

                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    badgeModulo(stat.visual.tipo, activa),
                  ].join(" ")}
                >
                  {stat.visual.label}
                </span>
              </div>
            </button>
          );
        })()}
      </div>

      <div className="p-6">
        {tabActiva === "informe" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">
              Detalle del informe técnico
            </h3>

            {!informe ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay informe técnico registrado todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">Fecha de recepción</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {informe.fecha_recepcion || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Estado de revisión</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {informe.estado_revision ? formatearTexto(informe.estado_revision) : "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Resumen técnico</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                    {informe.resumen_tecnico || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Hallazgos principales</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {informe.hallazgos_principales || "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "evidencia" && (
          <>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-semibold text-slate-100">
                Evidencia visual del informe
              </h3>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                {evidencias.length} archivo{evidencias.length === 1 ? "" : "s"}
              </span>
            </div>

            {evidencias.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay evidencias visuales asociadas a este informe.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {evidencias.map((evidencia) => (
                  <a
                    key={evidencia.id}
                    href={evidencia.archivo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 transition hover:border-slate-700"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                      <img
                        src={evidencia.archivo_url}
                        alt={evidencia.nombre_archivo || "Evidencia visual"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {evidencia.nombre_archivo || "Evidencia visual"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatearFecha(evidencia.created_at)}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {evidencia.descripcion || "Sin descripción"}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}

        {tabActiva === "diagnostico_humano" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">Diagnóstico humano</h3>

            {!diagnostico ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay diagnóstico humano registrado todavía.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {VALIDACION_REQUERIDA_LABEL}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-100">
                      {estadoLigero(diagnostico.requiere_validacion)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Validación pendiente
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-100">
                      {estadoLigero(diagnostico.validacion_pendiente)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Validación resuelta
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-100">
                      {estadoLigero(diagnostico.validacion_resuelta)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Resultado de validación
                    </p>
                    <div className="mt-2">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          badgeValidacionDiagnostico(
                            diagnostico.resultado_validacion,
                            diagnostico.validacion_pendiente
                          ),
                        ].join(" ")}
                      >
                        {diagnostico.resultado_validacion
                          ? formatearTexto(diagnostico.resultado_validacion)
                          : diagnostico.validacion_pendiente
                          ? "Pendiente"
                          : "Sin registrar"}
                      </span>
                    </div>
                  </div>
                </div>

                {diagnostico.motivos_validacion?.length ? (
                  <div
                    className={[
                      "rounded-2xl border p-4",
                      diagnostico.validacion_pendiente
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "border-slate-800 bg-slate-950",
                    ].join(" ")}
                  >
                    <p
                      className={[
                        "text-sm font-medium",
                        diagnostico.validacion_pendiente
                          ? "text-amber-200"
                          : "text-slate-200",
                      ].join(" ")}
                    >
                      {diagnostico.validacion_pendiente
                        ? "Motivos actuales de validación"
                        : "Motivos que originaron la validación"}
                    </p>
                    <ul
                      className={[
                        "mt-2 space-y-2 text-sm",
                        diagnostico.validacion_pendiente
                          ? "text-amber-100/80"
                          : "text-slate-300",
                      ].join(" ")}
                    >
                      {diagnostico.motivos_validacion.map((motivo) => (
                        <li key={motivo}>• {motivo}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {diagnostico.id && modoValidacionDiagnostico.disponible ? (
                  <ValidarDiagnosticoForm
                    casoId={casoId}
                    diagnosticoId={diagnostico.id}
                    resultadoActual={diagnostico.resultado_validacion}
                    fechaActual={diagnostico.fecha_validacion}
                    observacionActual={diagnostico.observacion_validacion}
                  />
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">Problemática identificada</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.problematica_identificada || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Causa probable</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.causa_probable || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Nivel de certeza</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.nivel_certeza ? formatearTexto(diagnostico.nivel_certeza) : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Categoría del caso</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.categoria_caso ? formatearTexto(diagnostico.categoria_caso) : "-"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-200">Solución recomendada</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.solucion_recomendada || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Producto recomendado</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.producto_recomendado || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Proceso sugerido</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.proceso_sugerido || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Validado por</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.validado_por || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-200">Fecha de validación</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.fecha_validacion || "-"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-200">Observación de validación</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                      {diagnostico.observacion_validacion || "-"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-slate-200">Observaciones técnicas</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {diagnostico.observaciones_tecnicas || "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "logistica" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">
              Logística / entrega
            </h3>

            {!logistica ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay un registro logístico formal todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Estado logístico
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {logistica.estado_logistico
                      ? formatearTexto(logistica.estado_logistico)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Responsable
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {logistica.responsable || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Fecha programada
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {logistica.fecha_programada || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Fecha de entrega
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatearFecha(logistica.fecha_entrega)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Entrega confirmada
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {estadoLigero(logistica.confirmacion_entrega)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">
                    Observación logística
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                    {logistica.observacion_logistica || "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "postventa" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">Postventa</h3>

            {!postventa ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay un registro formal de postventa todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Estado de postventa
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {postventa.estado_postventa
                      ? formatearTexto(postventa.estado_postventa)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Responsable
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {postventa.responsable_postventa || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Fecha de postventa
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatearFecha(postventa.fecha_postventa)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Conformidad final
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {estadoLigero(postventa.conformidad_final)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Próxima acción
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {postventa.proxima_accion || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Próxima fecha
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatearFecha(postventa.proxima_fecha)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Requiere acción
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {estadoLigero(postventa.requiere_accion)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">
                    Observación de postventa
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                    {postventa.observacion_postventa || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">
                    Notas
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">
                    {postventa.notas || "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "agente_ia" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">Asistencia IA relacionada</h3>
            <p className="mt-1 text-sm text-slate-400">
              Referencia complementaria para orientar criterio técnico. No reemplaza el diagnóstico humano ni el expediente formal.
            </p>

            {!diagnosticoAgente ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay asistencia IA registrada todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Resumen del caso</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.resumen_del_caso || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Categoría probable</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.categoria_probable
                      ? formatearTexto(diagnosticoAgente.categoria_probable)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Nivel de certeza</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.nivel_certeza
                      ? formatearTexto(diagnosticoAgente.nivel_certeza)
                      : "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Síntomas clave</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {listaTexto(diagnosticoAgente.sintomas_clave)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Causa probable</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.causa_probable || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Causas alternativas</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {listaTexto(diagnosticoAgente.causas_alternativas)}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Solución recomendada</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.solucion_recomendada || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Fuente</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {diagnosticoAgente.fuente_agente || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Creado</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatearFecha(diagnosticoAgente.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {VALIDACION_REQUERIDA_LABEL}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {estadoLigero(diagnosticoAgente.requiere_validacion)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Requiere escalamiento</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {estadoLigero(diagnosticoAgente.requiere_escalamiento)}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "cotizacion" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">Cotización</h3>

            {!cotizacion ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay cotización registrada todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">Fecha de cotización</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.fecha_cotizacion || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Estado</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.estado ? formatearTexto(cotizacion.estado) : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Monto</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {formatearMonto(cotizacion.monto)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Cantidades</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.cantidades || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Solución asociada</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.solucion_asociada || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Productos incluidos</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.productos_incluidos || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Condiciones</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.condiciones || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Observaciones</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {cotizacion.observaciones || "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {tabActiva === "seguimiento" && (
          <>
            <h3 className="text-base font-semibold text-slate-100">Seguimiento</h3>

            {!seguimiento ? (
              <p className="mt-4 text-sm text-slate-400">
                No hay seguimiento registrado todavía.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-200">Fecha</p>
                  <p className="mt-1 text-sm text-slate-400">{seguimiento.fecha || "-"}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Tipo de seguimiento</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimiento.tipo_seguimiento
                      ? formatearTexto(seguimiento.tipo_seguimiento)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Resultado</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimiento.resultado || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Estado comercial principal</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimientoComercial?.estado_principal
                      ? labelEstadoComercialPrincipal(
                          seguimientoComercial.estado_principal
                        )
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Señales comerciales</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimientoComercial &&
                    seguimientoComercial.senales_comerciales.length > 0
                      ? seguimientoComercial.senales_comerciales
                          .map((senal) => labelSenalComercial(senal))
                          .join(", ")
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Próximo paso</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimiento.proximo_paso || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-200">Próxima fecha</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimiento.proxima_fecha || "-"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-200">Observaciones del cliente</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {seguimiento.observaciones_cliente || "-"}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
