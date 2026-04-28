"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { CierreTecnicoCommand } from "@/core/application/casos/expediente/cierreTecnico";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default function CierreTecnicoPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [fechaCierreTecnico, setFechaCierreTecnico] = useState("");
  const [responsableCierre, setResponsableCierre] = useState("");
  const [motivoCierre, setMotivoCierre] = useState("");
  const [observacionCierre, setObservacionCierre] = useState("");
  const [postventaResuelta, setPostventaResuelta] = useState(true);
  const [requierePostventaAdicional, setRequierePostventaAdicional] =
    useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { id } = await params;
    setMensaje("");
    setError("");
    setGuardando(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const command: CierreTecnicoCommand = {
        caso_id: id,
        accion: "registrar_cierre_tecnico",
        payload: {
          fecha_cierre_tecnico: fechaCierreTecnico || null,
          responsable_cierre: responsableCierre.trim() || null,
          motivo_cierre: motivoCierre.trim() || null,
          observacion_cierre: observacionCierre.trim() || null,
          postventa_resuelta: postventaResuelta,
          requiere_postventa_adicional: requierePostventaAdicional,
        },
        actor,
      };

      const response = await fetch("/api/casos/cierre-tecnico", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      const body = (await response.json()) as {
        ok: boolean;
        data?: { ok: boolean; errores?: Array<{ mensaje: string }> };
        error?: string;
      };

      if (!body?.data) {
        setError(body?.error ?? "No se pudo registrar el cierre técnico.");
        return;
      }

      if (!body.data.ok) {
        setError(
          body.data.errores?.[0]?.mensaje ??
            "No se pudo registrar el cierre técnico."
        );
        return;
      }

      setMensaje("Cierre técnico guardado correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando el cierre técnico."
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
            Registrar cierre técnico
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Formaliza el final del ciclo operativo después de postventa.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de cierre técnico
              </label>
              <input
                type="date"
                value={fechaCierreTecnico}
                onChange={(e) => setFechaCierreTecnico(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Responsable de cierre
              </label>
              <input
                type="text"
                value={responsableCierre}
                onChange={(e) => setResponsableCierre(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Motivo de cierre
              </label>
              <input
                type="text"
                value={motivoCierre}
                onChange={(e) => setMotivoCierre(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observación de cierre
              </label>
              <textarea
                value={observacionCierre}
                onChange={(e) => setObservacionCierre(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={postventaResuelta}
                  onChange={(e) => setPostventaResuelta(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Confirmar que la postventa quedó resuelta
              </label>
              <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={requierePostventaAdicional}
                  onChange={(e) =>
                    setRequierePostventaAdicional(e.target.checked)
                  }
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Requiere postventa adicional
              </label>
            </div>

            {(mensaje || error) && (
              <div
                className={`rounded-lg border px-4 py-3 text-sm md:col-span-2 ${
                  error
                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {error || mensaje}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={guardando}
                className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Guardar cierre técnico"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
