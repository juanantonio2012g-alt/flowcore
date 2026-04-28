"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SeguimientoCommand, SeguimientoResult } from "@/core/application/casos/expediente/seguimiento";
import {
  ESTADOS_COMERCIALES_PRINCIPALES,
  SENALES_COMERCIALES_COMPLEMENTARIAS,
  labelEstadoComercialPrincipal,
  labelSenalComercial,
} from "@/core/application/casos/expediente/seguimiento/comercial";
import {
  MENSAJE_CONTENIDO_MINIMO_SEGUIMIENTO,
  tieneContenidoOperativoMinimoSeguimiento,
} from "@/core/application/casos/expediente/seguimiento/minimoOperativo";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

type SeguimientoApiResponse =
  | {
      ok?: boolean;
      error?: string;
      message?: string;
      data?: SeguimientoResult;
    }
  | undefined;

function esEstadoComercialResuelto(estado: string) {
  return estado === "aprobado" || estado === "rechazado";
}

function extraerMensajeErrorApi(
  body: SeguimientoApiResponse,
  fallback: string
) {
  return body?.data?.errores[0]?.mensaje ?? body?.error ?? body?.message ?? fallback;
}

export default function NuevoSeguimientoPage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [tipoSeguimiento, setTipoSeguimiento] = useState("llamada");
  const [resultado, setResultado] = useState("");
  const [proximoPaso, setProximoPaso] = useState("");
  const [proximaFecha, setProximaFecha] = useState("");
  const [estadoComercial, setEstadoComercial] = useState("en_proceso");
  const [senalesComerciales, setSenalesComerciales] = useState<string[]>([]);
  const [observacionesCliente, setObservacionesCliente] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const estadoComercialResuelto = esEstadoComercialResuelto(estadoComercial);

  function toggleSenalComercial(senal: string) {
    if (estadoComercialResuelto) {
      return;
    }

    setSenalesComerciales((actuales) =>
      actuales.includes(senal)
        ? actuales.filter((item) => item !== senal)
        : [...actuales, senal]
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const { id } = await params;
    const payload: SeguimientoCommand["payload"] = {
      tipo_seguimiento: tipoSeguimiento || null,
      resultado: resultado || null,
      proximo_paso: proximoPaso || null,
      proxima_fecha: proximaFecha || null,
      estado_comercial: estadoComercial || null,
      senales_comerciales: estadoComercialResuelto ? [] : senalesComerciales,
      observaciones_cliente: observacionesCliente || null,
    };

    setMensaje("");
    setError("");

    if (!tieneContenidoOperativoMinimoSeguimiento(payload)) {
      setError(MENSAJE_CONTENIDO_MINIMO_SEGUIMIENTO);
      return;
    }

    setGuardando(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const command: SeguimientoCommand = {
        caso_id: id,
        accion: "registrar_seguimiento",
        payload,
        actor,
      };

      const response = await fetch("/api/casos/seguimiento", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      let body: SeguimientoApiResponse;

      try {
        body = (await response.json()) as SeguimientoApiResponse;
      } catch {
        body = undefined;
      }

      if (!response.ok || !body?.data) {
        setError(
          extraerMensajeErrorApi(body, "No se pudo guardar el seguimiento.")
        );
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(
          extraerMensajeErrorApi(body, "No se pudo guardar el seguimiento.")
        );
        return;
      }

      setMensaje("Seguimiento guardado correctamente.");
      router.push(`/casos/${id}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando el seguimiento."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Nuevo seguimiento</h1>
          <p className="mt-2 text-sm text-slate-400">
            Registro de seguimiento asociado al caso
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Tipo de seguimiento
              </label>
              <select
                value={tipoSeguimiento}
                onChange={(e) => setTipoSeguimiento(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="llamada">Llamada</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="correo">Correo</option>
                <option value="reunion">Reunión</option>
                <option value="visita">Visita</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado comercial
              </label>
              <select
                value={estadoComercial}
                onChange={(e) => {
                  const siguienteEstado = e.target.value;
                  setEstadoComercial(siguienteEstado);

                  if (esEstadoComercialResuelto(siguienteEstado)) {
                    setSenalesComerciales([]);
                  }
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                {ESTADOS_COMERCIALES_PRINCIPALES.map((estado) => (
                  <option key={estado} value={estado}>
                    {labelEstadoComercialPrincipal(estado)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-200">
                Señales comerciales complementarias
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {SENALES_COMERCIALES_COMPLEMENTARIAS.map((senal) => (
                  <label
                    key={senal}
                    className={`flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm ${
                      estadoComercialResuelto
                        ? "cursor-not-allowed text-slate-500"
                        : "text-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={senalesComerciales.includes(senal)}
                      onChange={() => toggleSenalComercial(senal)}
                      disabled={estadoComercialResuelto}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-slate-100"
                    />
                    <span>{labelSenalComercial(senal)}</span>
                  </label>
                ))}
              </div>
              {estadoComercialResuelto ? (
                <p className="mt-2 text-xs text-slate-500">
                  Las señales complementarias solo aplican cuando el caso sigue abierto.
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Resultado
              </label>
              <textarea
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Próximo paso
              </label>
              <input
                type="text"
                value={proximoPaso}
                onChange={(e) => setProximoPaso(e.target.value)}
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
                Observaciones del cliente
              </label>
              <textarea
                value={observacionesCliente}
                onChange={(e) => setObservacionesCliente(e.target.value)}
                rows={4}
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
                  {guardando ? "Guardando..." : "Guardar seguimiento"}
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
