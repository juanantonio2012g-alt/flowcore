import Link from "next/link";
import { getCasoDetalleNormalizadoById } from "@/core/application/casos/useCases/getCasoDetalleNormalizadoById";
import DiagnosticoFormPageClient from "./diagnostico-form-page-client";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DiagnosticoPage({ params }: Props) {
  const { id } = await params;
  let detalle;

  try {
    detalle = await getCasoDetalleNormalizadoById(id);
  } catch {
    return (
      <main className="h-full overflow-auto bg-slate-950 p-3 text-slate-100">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-slate-100">Diagnóstico</h1>
          <p className="mt-3 text-sm text-red-400">No se pudo cargar el caso para diagnosticar.</p>
          <div className="mt-4">
            <Link
              href={`/casos/${id}`}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Volver al caso
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <DiagnosticoFormPageClient
      casoId={id}
      diagnosticoActual={detalle?.expediente.diagnostico_humano.data ?? null}
    />
  );
}
