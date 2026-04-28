"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  QuickUpdateCommand,
  QuickUpdateResult,
} from "@/core/application/casos";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  casoId: string;
  proximaAccionInicial: string;
  proximaFechaInicial: string;
  estadoComercialInicial: string;
};

export default function AccionesInlineOperativas({
  casoId,
  proximaAccionInicial,
  proximaFechaInicial,
  estadoComercialInicial,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [proximaAccion, setProximaAccion] = useState(proximaAccionInicial);
  const [proximaFecha, setProximaFecha] = useState(proximaFechaInicial);
  const [estadoComercial, setEstadoComercial] = useState(estadoComercialInicial);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  function hoyIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function sumarDiasIso(dias: number) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().slice(0, 10);
  }

  function aplicarCambiosLocales(result: QuickUpdateResult) {
    for (const cambio of result.cambios) {
      if (cambio.campo === "proxima_accion") {
        setProximaAccion(cambio.nuevo ?? "");
      }

      if (cambio.campo === "proxima_fecha") {
        setProximaFecha(cambio.nuevo ?? "");
      }

      if (cambio.campo === "estado_comercial") {
        setEstadoComercial(cambio.nuevo ?? "");
      }
    }
  }

  async function ejecutarComando(command: QuickUpdateCommand) {
    setMensaje("");
    setError("");

    setIsSubmitting(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const response = await fetch("/api/casos/quick-update", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...command,
          actor,
        }),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: QuickUpdateResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo guardar la actualización.");
        return;
      }

      const result = body.data;

      if (!result.ok) {
        setError(
          result.errores[0]?.mensaje ?? "No se pudo guardar la actualización."
        );
        return;
      }

      aplicarCambiosLocales(result);
      setMensaje(
        result.cambios.length > 0
          ? "Actualización guardada."
          : "Validado sin cambios efectivos."
      );

      if (result.advertencias.length > 0) {
        setError(result.advertencias[0]?.mensaje ?? "");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo guardar la actualización."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function guardar() {
    await ejecutarComando({
      caso_id: casoId,
      accion: "actualizacion_manual",
      payload: {
        proxima_accion: proximaAccion,
        proxima_fecha: proximaFecha || null,
        estado_comercial: estadoComercial || null,
      },
    });
  }

  return (
    <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">Actualización operativa inmediata</h2>
        <p className="mt-1 text-sm text-slate-400">
          Ajusta continuidad operativa sin salir del caso: próxima acción, próxima fecha y estado comercial.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs text-slate-400">Próxima acción</label>
          <input
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej. Dar seguimiento comercial"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">Próxima fecha</label>
          <input
            type="date"
            value={proximaFecha}
            onChange={(e) => setProximaFecha(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs text-slate-400">Estado comercial</label>
          <select
            value={estadoComercial}
            onChange={(e) => setEstadoComercial(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
          >
            <option value="">Sin estado</option>
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

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Fecha</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProximaFecha(hoyIso())}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={() => setProximaFecha(sumarDiasIso(1))}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              +1 día
            </button>

            <button
              type="button"
              onClick={() => setProximaFecha(sumarDiasIso(3))}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              +3 días
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Acción sugerida
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setProximaAccion("Dar seguimiento comercial")}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Seguimiento comercial
            </button>

            <button
              type="button"
              onClick={() => setProximaAccion("Validar diagnóstico")}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Validar diagnóstico
            </button>

            <button
              type="button"
              onClick={() => setProximaAccion("Preparar cotización")}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Preparar cotización
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Estado</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEstadoComercial("en_proceso")}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Marcar en proceso
            </button>

            <button
              type="button"
              onClick={() => setEstadoComercial("cotizado")}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Marcar cotizado
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={isSubmitting || isPending}
          className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {isSubmitting || isPending ? "Guardando..." : "Guardar actualización"}
        </button>

        {mensaje ? <p className="text-sm text-emerald-300">{mensaje}</p> : null}
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </section>
  );
}
