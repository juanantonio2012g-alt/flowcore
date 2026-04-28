"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditoriaCommand } from "@/core/application/casos/expediente/auditoria";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

const ESTADOS_AUDITORIA = [
  "pendiente",
  "en_revision",
  "conforme",
  "con_observaciones",
  "requiere_correccion",
  "cerrada",
] as const;

export default function AuditoriaPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [fechaAuditoria, setFechaAuditoria] = useState("");
  const [responsableAuditoria, setResponsableAuditoria] = useState("");
  const [estadoAuditoria, setEstadoAuditoria] = useState("pendiente");
  const [observacionesAuditoria, setObservacionesAuditoria] = useState("");
  const [conformidadCliente, setConformidadCliente] = useState(false);
  const [requiereCorreccion, setRequiereCorreccion] = useState(false);
  const [fechaCierreTecnico, setFechaCierreTecnico] = useState("");
  const [proximaAccion, setProximaAccion] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
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

      const command: AuditoriaCommand = {
        caso_id: id,
        accion: "registrar_auditoria",
        payload: {
          fecha_auditoria: fechaAuditoria || null,
          responsable_auditoria: responsableAuditoria.trim() || null,
          estado_auditoria: estadoAuditoria,
          observaciones_auditoria: observacionesAuditoria.trim() || null,
          conformidad_cliente: conformidadCliente,
          requiere_correccion: requiereCorreccion,
          fecha_cierre_tecnico: fechaCierreTecnico || null,
          proxima_accion: proximaAccion.trim() || null,
          proxima_fecha: proximaFecha || null,
        },
        actor,
      };

      const response = await fetch("/api/casos/auditoria", {
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
        setError(body?.error ?? "No se pudo guardar la auditoría.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores?.[0]?.mensaje ?? "No se pudo guardar la auditoría.");
        return;
      }

      setMensaje("Auditoría guardada correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando la auditoría."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Registrar auditoría</h1>
          <p className="mt-2 text-sm text-slate-400">
            Inserta los datos mínimos de auditoría y deja listo el paso estructural hacia postventa.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de auditoría
              </label>
              <input
                type="date"
                value={fechaAuditoria}
                onChange={(e) => setFechaAuditoria(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Responsable de auditoría
              </label>
              <input
                type="text"
                value={responsableAuditoria}
                onChange={(e) => setResponsableAuditoria(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado de auditoría
              </label>
              <select
                value={estadoAuditoria}
                onChange={(e) => setEstadoAuditoria(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                {ESTADOS_AUDITORIA.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observaciones de auditoría
              </label>
              <textarea
                value={observacionesAuditoria}
                onChange={(e) => setObservacionesAuditoria(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 md:col-span-2">
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={conformidadCliente}
                  onChange={(e) => setConformidadCliente(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Conformidad del cliente
              </label>
              <label className="mt-3 flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={requiereCorreccion}
                  onChange={(e) => setRequiereCorreccion(e.target.checked)}
                  className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
                />
                Requiere corrección
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de cierre técnico
              </label>
              <input
                type="date"
                value={fechaCierreTecnico}
                onChange={(e) => setFechaCierreTecnico(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
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
                  {guardando ? "Guardando..." : "Guardar auditoría"}
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
