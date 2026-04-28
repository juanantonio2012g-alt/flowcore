"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";
import { derivarModoValidacionDiagnosticoVigente } from "@/core/application/casos/expediente/diagnostico/ui";

type Props = {
  casoId: string;
  diagnosticoId: string;
  resultadoActual?: string | null;
  fechaActual?: string | null;
  observacionActual?: string | null;
};

function fechaHoyIsoDia() {
  return new Date().toISOString().slice(0, 10);
}

export default function ValidarDiagnosticoForm({
  casoId,
  diagnosticoId,
  resultadoActual,
  fechaActual,
  observacionActual,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const modo = derivarModoValidacionDiagnosticoVigente({
    id: diagnosticoId,
    problematica_identificada: null,
    causa_probable: null,
    nivel_certeza: null,
    categoria_caso: null,
    solucion_recomendada: null,
    producto_recomendado: null,
    proceso_sugerido: null,
    observaciones_tecnicas: null,
    requiere_validacion: true,
    validacion_pendiente: resultadoActual == null,
    validacion_resuelta: resultadoActual === "validado",
    resultado_validacion: resultadoActual,
    fecha_validacion: fechaActual ?? null,
    created_at: null,
  });
  const [abierto, setAbierto] = useState(resultadoActual === "observado");
  const [resultadoValidacion, setResultadoValidacion] = useState(
    resultadoActual === "observado" ||
      resultadoActual === "rechazado" ||
      resultadoActual === "validado"
      ? resultadoActual
      : "validado"
  );
  const [fechaValidacion, setFechaValidacion] = useState(
    fechaActual ?? fechaHoyIsoDia()
  );
  const [observacionValidacion, setObservacionValidacion] = useState(
    observacionActual ?? ""
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setMensaje("");
    setError("");

    try {
      const { actor, userId, headers } = await getJsonAuthContext(supabase);

      const response = await fetch("/api/casos/diagnostico/validacion", {
        method: "POST",
        headers,
        body: JSON.stringify({
          caso_id: casoId,
          diagnostico_id: diagnosticoId,
          payload: {
            resultado_validacion: resultadoValidacion,
            fecha_validacion: fechaValidacion || null,
            validado_por: userId,
            observacion_validacion: observacionValidacion.trim() || null,
          },
          actor,
        }),
      });

      const body = (await response.json()) as
        | {
            ok: boolean;
            data?: { ok: boolean; errores?: Array<{ mensaje: string }> };
            error?: string;
          }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo registrar la validación.");
        return;
      }

      if (!body.data.ok) {
        setError(
          body.data.errores?.[0]?.mensaje ??
            "No se pudo registrar la validación."
        );
        return;
      }

      setMensaje(modo.successMessage);
      setAbierto(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error registrando la validación."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-100">
            {modo.titulo}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {modo.descripcion}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
        >
          {abierto ? "Cancelar" : modo.toggleLabel}
        </button>
      </div>

      {abierto ? (
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Resultado
            </label>
            <select
              value={resultadoValidacion}
              onChange={(event) => setResultadoValidacion(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
            >
              <option value="validado">Validado</option>
              <option value="observado">Observado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Fecha de validación
            </label>
            <input
              type="date"
              value={fechaValidacion}
              onChange={(event) => setFechaValidacion(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Observación de validación
            </label>
            <textarea
              rows={4}
              value={observacionValidacion}
              onChange={(event) => setObservacionValidacion(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              placeholder="Resume el criterio de validación o la observación principal..."
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <div>
              {mensaje ? (
                <p className="text-sm text-emerald-300">{mensaje}</p>
              ) : null}
              {error ? <p className="text-sm text-red-300">{error}</p> : null}
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
            >
              {guardando ? "Guardando..." : modo.submitLabel}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
