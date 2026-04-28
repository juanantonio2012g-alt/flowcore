"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MENSAJE_CONTENIDO_MINIMO_ALTA_CASO,
  MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO,
  tieneDescripcionMinimaAltaCaso,
} from "@/core/application/casos/alta/minimoOperativo";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

export default function NuevoCasoPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cliente, setCliente] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [canal, setCanal] = useState("WhatsApp");
  const [prioridad, setPrioridad] = useState("Media");
  const [descripcion, setDescripcion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (!cliente.trim()) {
      setError("El nombre del cliente es obligatorio.");
      return;
    }

    if (!descripcion.trim()) {
      setError("No se puede abrir el caso sin descripción.");
      return;
    }

    if (!tieneDescripcionMinimaAltaCaso(descripcion)) {
      setError(MENSAJE_CONTENIDO_MINIMO_ALTA_CASO);
      return;
    }

    setGuardando(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);
      const response = await fetch("/api/casos", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cliente,
          proyecto,
          canal,
          prioridad,
          descripcion,
          actor,
        }),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: { id: string }; error?: string }
        | undefined;

      if (!response.ok || !body?.ok) {
        setError(body?.error ?? "No se pudo guardar el caso.");
        return;
      }

      setMensaje("Caso guardado correctamente.");
      router.push("/casos");
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando el caso."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto px-4 py-5 text-slate-900 xl:px-8 xl:py-6">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <section className="oc-hero-band px-6 py-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--line)] bg-white px-3 py-1.5">
                <span className="oc-topline-dot" />
                <p className="oc-label">OpenCore Intake</p>
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight text-slate-900 xl:text-[2.4rem]">
                Nuevo caso
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Captura cliente, canal, prioridad y contexto inicial para que el caso entre
                limpio a la operación.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="oc-chip">Ingreso rápido</span>
                <span className="oc-chip">Descripción mínima validada</span>
                <span className="oc-chip">Contexto listo para seguimiento</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <article className="oc-card-soft px-4 py-4">
                <p className="oc-label">Canales</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  WhatsApp, llamada, correo, referido o visita
                </p>
              </article>
              <article className="oc-card-soft px-4 py-4">
                <p className="oc-label">Priorización</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  El caso nace con prioridad operativa visible
                </p>
              </article>
              <article className="oc-card-soft px-4 py-4">
                <p className="oc-label">Continuidad</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  La descripción mínima evita casos vacíos o ambiguos
                </p>
              </article>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.25fr,0.72fr]">
          <div className="oc-card p-5 xl:p-6">
            <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Cliente"
                  required
                  className="oc-input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Empresa / Proyecto
                </label>
                <input
                  type="text"
                  value={proyecto}
                  onChange={(e) => setProyecto(e.target.value)}
                  placeholder="Proyecto"
                  className="oc-input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Canal de entrada
                </label>
                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  className="oc-input"
                >
                  <option>WhatsApp</option>
                  <option>Llamada</option>
                  <option>Correo</option>
                  <option>Referido</option>
                  <option>Visita</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Prioridad
                </label>
                <select
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                  className="oc-input"
                >
                  <option>Media</option>
                  <option>Alta</option>
                  <option>Urgente</option>
                  <option>Baja</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Descripción inicial
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Describe el síntoma, contexto o necesidad concreta del caso..."
                  rows={5}
                  required
                  className="oc-input min-h-[170px] resize-y"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Mínimo {MINIMO_CARACTERES_DESCRIPCION_ALTA_CASO} caracteres útiles.
                </p>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="oc-button disabled:opacity-60"
                  >
                    {guardando ? "Guardando..." : "Guardar caso"}
                  </button>

                  {mensaje ? (
                    <p className="text-sm text-emerald-700">{mensaje}</p>
                  ) : null}
                  {error ? (
                    <p className="max-w-md text-right text-sm text-red-600">{error}</p>
                  ) : null}
                </div>
              </div>
            </form>
          </div>

          <aside className="space-y-4">
            <section className="oc-card-soft p-5">
              <p className="oc-label">Qué cuida esta vista</p>
              <div className="mt-4 space-y-3">
                <div className="oc-card-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Entrada ordenada
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    Cliente, canal y prioridad quedan claros desde el primer momento.
                  </p>
                </div>
                <div className="oc-card-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Calidad mínima
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    La descripción útil evita casos vacíos o ambiguos.
                  </p>
                </div>
                <div className="oc-card-muted p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    Continuidad
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-900">
                    El caso entra preparado para seguimiento y ownership.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
