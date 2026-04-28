"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { PostventaCommand } from "@/core/application/casos/expediente/postventa";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const ESTADOS_POSTVENTA = [
  "abierta",
  "en_seguimiento",
  "requiere_accion",
  "resuelta",
  "cerrada",
] as const;

export default function PostventaPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [fechaPostventa, setFechaPostventa] = useState("");
  const [estadoPostventa, setEstadoPostventa] = useState("abierta");
  const [observacionPostventa, setObservacionPostventa] = useState("");
  const [requiereAccion, setRequiereAccion] = useState(false);
  const [proximaAccion, setProximaAccion] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
  const [conformidadFinal, setConformidadFinal] = useState(false);
  const [responsablePostventa, setResponsablePostventa] = useState("");
  const [notas, setNotas] = useState("");
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

      const command: PostventaCommand = {
        caso_id: id,
        accion: "registrar_postventa",
        payload: {
          fecha_postventa: fechaPostventa || null,
          estado_postventa: estadoPostventa,
          observacion_postventa: observacionPostventa.trim() || null,
          requiere_accion: requiereAccion,
          proxima_accion: proximaAccion.trim() || null,
          proxima_fecha: proximaFecha || null,
          conformidad_final: conformidadFinal,
          responsable_postventa: responsablePostventa.trim() || null,
          notas: notas.trim() || null,
        },
        actor,
      };

      const response = await fetch("/api/casos/postventa", {
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
        setError(body?.error ?? "No se pudo guardar la postventa.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores?.[0]?.mensaje ?? "No se pudo guardar la postventa.");
        return;
      }

      setMensaje("Postventa guardada correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando la postventa."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Registrar postventa</h1>
          <p className="mt-2 text-sm text-slate-400">
            Formaliza el seguimiento posterior a auditoría antes del cierre técnico.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de postventa
              </label>
              <input
                type="date"
                value={fechaPostventa}
                onChange={(e) => setFechaPostventa(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Responsable
              </label>
              <input
                type="text"
                value={responsablePostventa}
                onChange={(e) => setResponsablePostventa(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado de postventa
              </label>
              <select
                value={estadoPostventa}
                onChange={(e) => setEstadoPostventa(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                {ESTADOS_POSTVENTA.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observación de postventa
              </label>
              <textarea
                value={observacionPostventa}
                onChange={(e) => setObservacionPostventa(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={requiereAccion}
                  onChange={(e) => setRequiereAccion(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Requiere acción
              </label>
              <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={conformidadFinal}
                  onChange={(e) => setConformidadFinal(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Conformidad final
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

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            {(mensaje || error) && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm md:col-span-2 ${
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
                {guardando ? "Guardando..." : "Guardar postventa"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
