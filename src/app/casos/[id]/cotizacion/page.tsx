"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CotizacionCommand,
  CotizacionResult,
} from "@/core/application/casos/expediente/cotizacion";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default function NuevaCotizacionPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fechaCotizacion, setFechaCotizacion] = useState("");
  const [solucionAsociada, setSolucionAsociada] = useState("");
  const [productosIncluidos, setProductosIncluidos] = useState("");
  const [cantidades, setCantidades] = useState("");
  const [condiciones, setCondiciones] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [monto, setMonto] = useState("");
  const [estado, setEstado] = useState("pendiente");
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
      const montoNumerico =
        monto.trim() === "" ? null : Number.parseFloat(monto.trim());

      if (monto.trim() !== "" && Number.isNaN(montoNumerico)) {
        setError("El monto debe ser un número válido.");
        return;
      }

      const { actor, headers } = await getJsonAuthContext(supabase);

      const command: CotizacionCommand = {
        caso_id: id,
        accion: "registrar_cotizacion",
        payload: {
          fecha_cotizacion: fechaCotizacion || null,
          solucion_asociada: solucionAsociada.trim() || null,
          productos_incluidos: productosIncluidos.trim() || null,
          cantidades: cantidades.trim() || null,
          condiciones: condiciones.trim() || null,
          observaciones: observaciones.trim() || null,
          monto: montoNumerico,
          estado: estado.trim() || null,
        },
        actor,
      };

      const response = await fetch("/api/casos/cotizacion", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: CotizacionResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo guardar la cotización.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores[0]?.mensaje ?? "No se pudo guardar la cotización.");
        return;
      }

      setMensaje("Cotización guardada correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando la cotización."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Nueva cotización</h1>
          <p className="mt-2 text-sm text-slate-400">
            Registro de cotización asociada al caso
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de cotización
              </label>
              <input
                type="date"
                value={fechaCotizacion}
                onChange={(e) => setFechaCotizacion(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="pendiente">Pendiente</option>
                <option value="enviada">Enviada</option>
                <option value="ajustada">Ajustada</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Solución asociada
              </label>
              <textarea
                value={solucionAsociada}
                onChange={(e) => setSolucionAsociada(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Productos incluidos
              </label>
              <textarea
                value={productosIncluidos}
                onChange={(e) => setProductosIncluidos(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Cantidades
              </label>
              <input
                type="text"
                value={cantidades}
                onChange={(e) => setCantidades(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Monto
              </label>
              <input
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Condiciones
              </label>
              <textarea
                value={condiciones}
                onChange={(e) => setCondiciones(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
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
                  {guardando ? "Guardando..." : "Guardar cotización"}
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
