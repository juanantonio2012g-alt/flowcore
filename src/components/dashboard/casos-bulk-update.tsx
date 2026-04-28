"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  BulkUpdateCommand,
  BulkUpdateResult,
  CasosBulkUpdateItem,
} from "@/core/application/casos";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  casos: CasosBulkUpdateItem[];
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function normalizarFechaSoloDia(valor: string | null) {
  if (!valor) return "";
  return valor.slice(0, 10);
}

function construirMensajeExito(result: BulkUpdateResult) {
  if (result.total_actualizados === 0) {
    return "";
  }

  if (result.total_omitidos > 0) {
    return `Acción aplicada parcialmente a ${result.total_actualizados} caso(s).`;
  }

  return `Acción aplicada a ${result.total_actualizados} caso(s).`;
}

function construirMensajeError(result: BulkUpdateResult) {
  if (!result.errores.length) {
    return "";
  }

  return result.errores[0]?.mensaje ?? "No se pudo ejecutar la acción.";
}

export default function CasosBulkUpdate({ casos }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [proximaFechaNueva, setProximaFechaNueva] = useState("");
  const [estadoComercial, setEstadoComercial] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const casosEnRango = useMemo(() => {
    return casos.filter((caso) => {
      const fecha = normalizarFechaSoloDia(caso.proxima_fecha_real);
      if (!fecha) return false;
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      return true;
    });
  }, [casos, fechaDesde, fechaHasta]);

  const todosEnRangoSeleccionados = useMemo(() => {
    if (casosEnRango.length === 0) return false;
    return casosEnRango.every((caso) => seleccionados.includes(caso.id));
  }, [casosEnRango, seleccionados]);

  function toggleCaso(id: string) {
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function seleccionarTodosEnRango() {
    setMensaje("");
    setError("");

    if (casosEnRango.length === 0) {
      setError("No hay casos dentro del rango seleccionado.");
      return;
    }

    setSeleccionados((prev) => {
      const idsRango = casosEnRango.map((caso) => caso.id);

      if (todosEnRangoSeleccionados) {
        return prev.filter((id) => !idsRango.includes(id));
      }

      return Array.from(new Set([...prev, ...idsRango]));
    });
  }

  function limpiarTodo() {
    setFechaDesde("");
    setFechaHasta("");
    setProximaFechaNueva("");
    setEstadoComercial("");
    setSeleccionados([]);
    setMensaje("");
    setError("");
  }

  async function ejecutarComando(command: BulkUpdateCommand) {
    setMensaje("");
    setError("");

    setIsSubmitting(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const respuesta = await fetch("/api/casos/bulk-update", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...command,
          actor,
        }),
      });

      const body = (await respuesta.json()) as
        | { ok: boolean; data?: BulkUpdateResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo ejecutar la acción coordinada.");
        return;
      }

      const resultado = body.data;
      const mensajeExito = construirMensajeExito(resultado);
      const mensajeError = construirMensajeError(resultado);

      if (mensajeExito) {
        setMensaje(mensajeExito);
      }

      if (mensajeError) {
        setError(mensajeError);
      }

      if (resultado.total_actualizados > 0) {
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo ejecutar la acción coordinada."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function aplicarManual() {
    await ejecutarComando({
      caso_ids: seleccionados,
      accion: "actualizacion_manual",
      payload: {
        proxima_fecha: proximaFechaNueva || null,
        estado_comercial: estadoComercial || null,
      },
    });
  }

  async function aplicarSugerenciaMasiva() {
    await ejecutarComando({
      caso_ids: seleccionados,
      accion: "aplicar_sugerencia",
    });
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-medium text-slate-100">Acción coordinada sobre casos</h2>
        <p className="text-xs text-slate-400">
          Herramienta táctica para aplicar cambios por bloque sin abrir cada caso.
        </p>
      </div>

      <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Fecha desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Fecha hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Nueva fecha</label>
          <input
            type="date"
            value={proximaFechaNueva}
            onChange={(e) => setProximaFechaNueva(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Estado comercial</label>
          <select
            value={estadoComercial}
            onChange={(e) => setEstadoComercial(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 outline-none"
          >
            <option value="">Sin cambio</option>
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

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={seleccionarTodosEnRango}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          {todosEnRangoSeleccionados
            ? "Quitar selección"
            : "Seleccionar rango"}
        </button>

        <button
          type="button"
          onClick={aplicarManual}
          disabled={isSubmitting || isPending}
          className="rounded bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {isSubmitting || isPending ? "Aplicando..." : "Aplicar manual"}
        </button>

        <button
          type="button"
          onClick={aplicarSugerenciaMasiva}
          disabled={isSubmitting || isPending}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 disabled:opacity-60"
        >
          {isSubmitting || isPending ? "Aplicando..." : "Aplicar sugerencia"}
        </button>

        <button
          type="button"
          onClick={limpiarTodo}
          className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
        >
          Limpiar
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-slate-500">
          {casosEnRango.length} en rango
        </span>
        <span className="text-slate-500">
          {seleccionados.length} seleccionado(s)
        </span>

        {mensaje && <span className="text-emerald-300">{mensaje}</span>}
        {error && <span className="text-red-300">{error}</span>}
      </div>

      <div className="space-y-1">
        {casos.length === 0 ? (
          <p className="text-xs text-slate-400">No hay casos disponibles.</p>
        ) : (
          casos.map((caso) => {
            const fechaCaso = normalizarFechaSoloDia(caso.proxima_fecha_real);
            const enRango =
              !!fechaCaso &&
              (!fechaDesde || fechaCaso >= fechaDesde) &&
              (!fechaHasta || fechaCaso <= fechaHasta);

            return (
              <label
                key={caso.id}
                className={[
                  "flex cursor-pointer items-center gap-3 rounded border px-3 py-2",
                  enRango
                    ? "border-sky-500/20 bg-sky-500/5"
                    : "border-slate-800 bg-slate-950",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={seleccionados.includes(caso.id)}
                  onChange={() => toggleCaso(caso.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {caso.cliente}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {caso.proyecto} · Caso {caso.id.slice(0, 8)}
                  </p>
                </div>
                <div className="text-right text-xs">
                  <p className={`${
                    caso.riesgo === "alto"
                      ? "text-red-300"
                      : caso.riesgo === "medio"
                      ? "text-amber-300"
                      : "text-slate-400"
                  }`}>
                    riesgo {formatearTexto(caso.riesgo)}
                  </p>
                  <p className="text-slate-500">
                    {formatearTexto(caso.estado_comercial_real)}
                  </p>
                </div>
              </label>
            );
          })
        )}
      </div>
    </section>
  );
}
