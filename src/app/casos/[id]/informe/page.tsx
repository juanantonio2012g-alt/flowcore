"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { InformeCommand, InformeEvidenciaInput, InformeResult } from "@/core/application/casos/expediente/informe";
import { createClient } from "@/lib/supabase/client";
import { getJsonAuthContext } from "@/lib/supabase/client-auth";
import { uploadEvidenciaResumable } from "@/lib/storage/upload-evidencia-resumable";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default function NuevoInformePage({ params }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fechaRecepcion, setFechaRecepcion] = useState("");
  const [resumenTecnico, setResumenTecnico] = useState("");
  const [hallazgosPrincipales, setHallazgosPrincipales] = useState("");
  const [estadoRevision, setEstadoRevision] = useState("pendiente_revision");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [progresoGlobal, setProgresoGlobal] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function handleFilesChange(e: ChangeEvent<HTMLInputElement>) {
    const seleccionados = Array.from(e.target.files ?? []);
    setArchivos(seleccionados);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (archivos.length === 0) {
      setError("El informe requiere al menos una foto de evidencia visual");
      return;
    }

    const { id: casoId } = await params;

    setMensaje("");
    setError("");
    setGuardando(true);
    setProgresoGlobal(0);

    try {
      const { actor, headers } = await getJsonAuthContext(supabase);

      const uploadBatchId = crypto.randomUUID();
      const evidenciasSubidas: InformeEvidenciaInput[] = [];

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const extension = archivo.name.split(".").pop()?.toLowerCase() || "jpg";
        const nombreSeguro = archivo.name
          .toLowerCase()
          .replace(/[^a-z0-9.\-_]/g, "-")
          .replace(/-+/g, "-");

        const objectName = `${casoId}/informe-upload/${uploadBatchId}/${Date.now()}-${i}-${nombreSeguro || `evidencia.${extension}`}`;

        const resultado = await uploadEvidenciaResumable({
          bucketName: "evidencias",
          objectName,
          file: archivo,
          onProgress: (percentage) => {
            const base = i / archivos.length;
            const actual = (percentage / 100) * (1 / archivos.length);
            setProgresoGlobal(Math.round((base + actual) * 100));
          },
        });

        evidenciasSubidas.push({
          archivo_path: resultado.path,
          archivo_url: resultado.publicUrl,
          nombre_archivo: archivo.name,
          descripcion: null,
          tipo: "foto",
        });
      }

      setProgresoGlobal(100);

      const command: InformeCommand = {
        caso_id: casoId,
        accion: "registrar_informe",
        payload: {
          fecha_recepcion: fechaRecepcion || null,
          resumen_tecnico: resumenTecnico.trim() || null,
          hallazgos_principales: hallazgosPrincipales.trim() || null,
          estado_revision: estadoRevision,
          evidencias: evidenciasSubidas,
        },
        actor,
      };

      const response = await fetch("/api/casos/informe", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      const body = (await response.json()) as
        | { ok: boolean; data?: InformeResult; error?: string }
        | undefined;

      if (!body?.data) {
        setError(body?.error ?? "No se pudo guardar el informe.");
        return;
      }

      const result = body.data;
      if (!result.ok) {
        setError(result.errores[0]?.mensaje ?? "No se pudo guardar el informe.");
        return;
      }

      setMensaje("Informe técnico y evidencias guardados correctamente.");
      router.push(`/casos/${casoId}`);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "Hubo un error guardando el informe."
      );
    } finally {
      setGuardando(false);
      setProgresoGlobal(null);
    }
  }

  return (
    <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-100">Nuevo informe técnico</h1>
          <p className="mt-2 text-sm text-slate-400">
            Registro del informe técnico asociado al caso
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fecha de recepción
              </label>
              <input
                type="date"
                value={fechaRecepcion}
                onChange={(e) => setFechaRecepcion(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Estado de revisión
              </label>
              <select
                value={estadoRevision}
                onChange={(e) => setEstadoRevision(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              >
                <option value="pendiente_revision">Pendiente revisión</option>
                <option value="en_revision">En revisión</option>
                <option value="revisado">Revisado</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Resumen técnico
              </label>
              <textarea
                value={resumenTecnico}
                onChange={(e) => setResumenTecnico(e.target.value)}
                rows={5}
                placeholder="Resume el contenido técnico del informe..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Hallazgos principales
              </label>
              <textarea
                value={hallazgosPrincipales}
                onChange={(e) => setHallazgosPrincipales(e.target.value)}
                rows={5}
                placeholder="Describe los hallazgos principales..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-200">
                Fotos de evidencia visual
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-950"
              />
              <p className="mt-2 text-xs text-slate-500">
                Obligatorio. Este flujo está pensado para fotos pesadas con reanudación de carga.
              </p>

              {archivos.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <p className="text-xs font-medium text-slate-300">
                    Archivos seleccionados: {archivos.length}
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {archivos.map((archivo) => (
                      <li key={`${archivo.name}-${archivo.size}`}>
                        {archivo.name} — {(archivo.size / (1024 * 1024)).toFixed(2)} MB
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {progresoGlobal !== null && (
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Progreso de carga</span>
                  <span>{progresoGlobal}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-cyan-300 transition-all"
                    style={{ width: `${progresoGlobal}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <div className="flex flex-col items-end gap-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-medium text-slate-950 hover:bg-white disabled:opacity-60"
                >
                  {guardando ? "Guardando..." : "Guardar informe"}
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
