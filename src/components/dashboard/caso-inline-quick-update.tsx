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
  recomendacionAccion?: string;
  recomendacionFecha?: string | null;
  recomendacionUrgencia?: "alta" | "media" | "baja";
};

export default function CasoInlineQuickUpdate({
  casoId,
  proximaAccionInicial,
  proximaFechaInicial,
  estadoComercialInicial,
  recomendacionAccion = "",
  recomendacionFecha = null,
  recomendacionUrgencia,
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

  function construirMensaje(result: QuickUpdateResult) {
    if (result.accion === "aplicar_sugerencia") {
      return result.cambios.length > 0
        ? "Sugerencia aplicada"
        : "Sugerencia validada sin cambios efectivos";
    }

    return result.cambios.length > 0
      ? "Guardado"
      : "Validado sin cambios efectivos";
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
        setError(body?.error ?? "No se pudo ejecutar la acción.");
        return;
      }

      const result = body.data;

      if (!result.ok) {
        setError(result.errores[0]?.mensaje ?? "No se pudo ejecutar la acción.");
        return;
      }

      aplicarCambiosLocales(result);
      setMensaje(construirMensaje(result));

      if (result.advertencias.length > 0) {
        setError(result.advertencias[0]?.mensaje ?? "");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo ejecutar la acción."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function guardarManual() {
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

  async function aplicarSugerencia() {
    await ejecutarComando({
      caso_id: casoId,
      accion: "aplicar_sugerencia",
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">
            Próxima acción
          </label>
          <input
            value={proximaAccion}
            onChange={(e) => setProximaAccion(e.target.value)}
            placeholder="Ej. Dar seguimiento comercial"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 outline-none placeholder:text-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">
            Próxima fecha
          </label>
          <input
            type="date"
            value={proximaFecha}
            onChange={(e) => setProximaFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-slate-500">
            Estado comercial
          </label>
          <select
            value={estadoComercial}
            onChange={(e) => setEstadoComercial(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 outline-none"
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

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setProximaFecha(hoyIso())}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => setProximaFecha(sumarDiasIso(1))}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          +1 día
        </button>
        <button
          type="button"
          onClick={() => setProximaFecha(sumarDiasIso(3))}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          +3 días
        </button>
        <button
          type="button"
          onClick={() => setProximaAccion("Dar seguimiento comercial")}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          Seguimiento
        </button>
        <button
          type="button"
          onClick={() => setProximaAccion("Validar diagnóstico")}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          Validar
        </button>
        <button
          type="button"
          onClick={() => setProximaAccion("Preparar cotización")}
          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-800"
        >
          Cotización
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={guardarManual}
          disabled={isSubmitting || isPending}
          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-white disabled:opacity-60"
        >
          {isSubmitting || isPending ? "Guardando..." : "Guardar"}
        </button>

        {recomendacionAccion ? (
          <button
            type="button"
            onClick={aplicarSugerencia}
            disabled={isSubmitting || isPending}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-60"
          >
            {isSubmitting || isPending ? "Aplicando..." : "Aplicar sugerencia"}
          </button>
        ) : null}

        {mensaje ? <span className="text-xs text-emerald-300">{mensaje}</span> : null}
        {error ? <span className="text-xs text-red-300">{error}</span> : null}
      </div>
    </div>
  );
}
