"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DiagnosticoDetalleData } from "@/core/domain/casos/detalle/contracts";
import type {
  DiagnosticoCommand,
  DiagnosticoResult,
} from "@/core/application/casos/expediente/diagnostico";
import { derivarModoDiagnosticoVigente } from "@/core/application/casos/expediente/diagnostico/ui";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";

type Props = {
  casoId: string;
  diagnosticoActual: DiagnosticoDetalleData;
};

export default function DiagnosticoFormPageClient({
  casoId,
  diagnosticoActual,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const modo = useMemo(
    () => derivarModoDiagnosticoVigente(diagnosticoActual),
    [diagnosticoActual]
  );

  const [problematicaIdentificada, setProblematicaIdentificada] = useState(
    diagnosticoActual?.problematica_identificada ?? ""
  );
  const [causaProbable, setCausaProbable] = useState(
    diagnosticoActual?.causa_probable ?? ""
  );
  const [nivelCerteza, setNivelCerteza] = useState(
    diagnosticoActual?.nivel_certeza ?? "medio"
  );
  const [categoriaCaso, setCategoriaCaso] = useState(
    diagnosticoActual?.categoria_caso ?? "patologia_superficie"
  );
  const [solucionRecomendada, setSolucionRecomendada] = useState(
    diagnosticoActual?.solucion_recomendada ?? ""
  );
  const [productoRecomendado, setProductoRecomendado] = useState(
    diagnosticoActual?.producto_recomendado ?? ""
  );
  const [procesoSugerido, setProcesoSugerido] = useState(
    diagnosticoActual?.proceso_sugerido ?? ""
  );
  const [observacionesTecnicas, setObservacionesTecnicas] = useState(
    diagnosticoActual?.observaciones_tecnicas ?? ""
  );
  const [requiereValidacion, setRequiereValidacion] = useState(
    diagnosticoActual?.requiere_validacion ?? true
  );
  const [fechaValidacion, setFechaValidacion] = useState(
    diagnosticoActual?.fecha_validacion ?? ""
  );
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");
    setGuardando(true);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const command: DiagnosticoCommand = {
        caso_id: casoId,
        accion: modo.accion,
        diagnostico_id: modo.diagnosticoId,
        payload: {
          problematica_identificada: problematicaIdentificada.trim() || null,
          causa_probable: causaProbable.trim() || null,
          nivel_certeza: nivelCerteza.trim() || null,
          categoria_caso: categoriaCaso.trim() || null,
          solucion_recomendada: solucionRecomendada.trim() || null,
          producto_recomendado: productoRecomendado.trim() || null,
          proceso_sugerido: procesoSugerido.trim() || null,
          observaciones_tecnicas: observacionesTecnicas.trim() || null,
          requiere_validacion: requiereValidacion,
          fecha_validacion: fechaValidacion || null,
        },
        actor,
      };

      const response = await fetch("/api/casos/diagnostico", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: DiagnosticoResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo guardar el diagnóstico.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores[0]?.mensaje ?? "No se pudo guardar el diagnóstico.");
        return;
      }

      setMensaje(
        modo.accion === "actualizar_diagnostico"
          ? "Diagnóstico actualizado correctamente."
          : "Diagnóstico guardado correctamente."
      );
      router.push(`/casos/${casoId}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando el diagnóstico."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">{modo.titulo}</h1>
          <p className="mt-2 text-sm text-slate-400">{modo.descripcion}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Problemática identificada
              </label>
              <input
                type="text"
                value={problematicaIdentificada}
                onChange={(e) => setProblematicaIdentificada(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Causa probable
              </label>
              <input
                type="text"
                value={causaProbable}
                onChange={(e) => setCausaProbable(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Nivel de certeza
              </label>
              <select
                value={nivelCerteza}
                onChange={(e) => setNivelCerteza(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="muy_bajo">Muy bajo</option>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="muy_alto">Muy alto</option>
                <option value="confirmado">Confirmado</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Categoría del caso
              </label>
              <select
                value={categoriaCaso}
                onChange={(e) => setCategoriaCaso(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="patologia_superficie">Patología de superficie</option>
                <option value="humedad_filtracion">Humedad / filtración</option>
                <option value="grietas_fisuras">Grietas / fisuras</option>
                <option value="desprendimiento_delaminacion">
                  Desprendimiento / delaminación
                </option>
                <option value="falla_acabado">Falla de acabado</option>
                <option value="falla_aplicacion">Falla de aplicación</option>
                <option value="compatibilidad_materiales">
                  Compatibilidad de materiales
                </option>
                <option value="preparacion_superficie">
                  Preparación de superficie
                </option>
                <option value="mantenimiento_reparacion">
                  Mantenimiento / reparación
                </option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Solución recomendada
              </label>
              <textarea
                value={solucionRecomendada}
                onChange={(e) => setSolucionRecomendada(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Producto recomendado
              </label>
              <input
                type="text"
                value={productoRecomendado}
                onChange={(e) => setProductoRecomendado(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Proceso sugerido
              </label>
              <input
                type="text"
                value={procesoSugerido}
                onChange={(e) => setProcesoSugerido(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Observaciones técnicas
              </label>
              <textarea
                value={observacionesTecnicas}
                onChange={(e) => setObservacionesTecnicas(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="requiere-validacion"
                type="checkbox"
                checked={requiereValidacion}
                onChange={(e) => setRequiereValidacion(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950"
              />
              <label
                htmlFor="requiere-validacion"
                className="text-sm font-medium text-slate-200"
              >
                Requiere validación
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de validación
              </label>
              <input
                type="date"
                value={fechaValidacion}
                onChange={(e) => setFechaValidacion(e.target.value)}
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
                  {guardando ? "Guardando..." : modo.cta}
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
