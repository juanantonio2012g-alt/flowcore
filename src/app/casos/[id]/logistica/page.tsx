"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  LogisticaCommand,
  LogisticaResult,
} from "@/core/application/casos/expediente/logistica";
import {
  MENSAJE_CONTENIDO_MINIMO_LOGISTICA,
  tieneContenidoOperativoMinimoLogistica,
} from "@/core/application/casos/expediente/logistica/minimoOperativo";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default function NuevaLogisticaPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fechaProgramada, setFechaProgramada] = useState("");
  const [responsable, setResponsable] = useState("");
  const [estadoLogistico, setEstadoLogistico] = useState("pendiente");
  const [observacionLogistica, setObservacionLogistica] = useState("");
  const [confirmacionEntrega, setConfirmacionEntrega] = useState(false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [proximaAccion, setProximaAccion] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { id } = await params;
    const payload: LogisticaCommand["payload"] = {
      fecha_programada: fechaProgramada || null,
      responsable: responsable.trim() || null,
      estado_logistico: estadoLogistico || null,
      observacion_logistica: observacionLogistica.trim() || null,
      confirmacion_entrega: confirmacionEntrega,
      fecha_entrega: fechaEntrega || null,
      proxima_accion: proximaAccion.trim() || null,
      proxima_fecha: proximaFecha || null,
    };

    setMensaje("");
    setError("");

    if (!tieneContenidoOperativoMinimoLogistica(payload)) {
      setError(MENSAJE_CONTENIDO_MINIMO_LOGISTICA);
      return;
    }

    setGuardando(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const command: LogisticaCommand = {
        caso_id: id,
        accion: "registrar_logistica",
        payload,
        actor,
      };

      const response = await fetch("/api/casos/logistica", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: LogisticaResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo guardar la logística.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores[0]?.mensaje ?? "No se pudo guardar la logística.");
        return;
      }

      setMensaje("Logística guardada correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando la logística."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">
            Nueva logística / entrega
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Apertura mínima del tramo logístico para programar, ejecutar o confirmar entrega.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha programada
              </label>
              <input
                type="date"
                value={fechaProgramada}
                onChange={(e) => setFechaProgramada(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Responsable
              </label>
              <input
                type="text"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado logístico
              </label>
              <select
                value={estadoLogistico}
                onChange={(e) => setEstadoLogistico(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="pendiente">Pendiente</option>
                <option value="programado">Programado</option>
                <option value="en_ejecucion">En ejecución</option>
                <option value="entregado">Entregado</option>
                <option value="incidencia">Incidencia</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de entrega
              </label>
              <input
                type="datetime-local"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observación logística
              </label>
              <textarea
                value={observacionLogistica}
                onChange={(e) => setObservacionLogistica(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={confirmacionEntrega}
                  onChange={(e) => setConfirmacionEntrega(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Confirmar entrega realizada
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Próxima acción
              </label>
              <input
                type="text"
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Próxima fecha
              </label>
              <input
                type="date"
                value={proximaFecha}
                onChange={(e) => setProximaFecha(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <div className="flex flex-col items-end gap-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Guardar logística"}
                </button>

                {mensaje ? (
                  <p className="text-sm text-emerald-300">{mensaje}</p>
                ) : null}
                {error ? (
                  <p className="text-sm text-red-300">{error}</p>
                ) : null}
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
