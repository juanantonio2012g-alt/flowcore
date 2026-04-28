import Link from "next/link";
import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import CasosBoardClient from "@/components/casos/casos-board-client";
import type { GetCasosNormalizadosResult } from "@/core/application/casos/contracts";

type Props = {
  searchParams?: Promise<{
    macroarea?: string;
    q?: string;
  }>;
};

export default async function CasosPage({ searchParams }: Props) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const busquedaInicial = (resolvedSearchParams.q ?? "").trim();
  let resultado: GetCasosNormalizadosResult;
  let lecturaDegradada = false;

  try {
    resultado = await getCasosNormalizados();
  } catch {
    lecturaDegradada = true;
    resultado = {
      items: [],
      meta: {
        total: 0,
        riesgo_alto: 0,
        sin_proxima_fecha: 0,
        sin_proxima_accion: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
      bulk_items: [],
    };
  }

  const { items, meta } = resultado;

  return (
    <>
      {lecturaDegradada ? (
        <div className="px-5 pt-5 xl:px-9">
          <section className="mx-auto max-w-[1215px] rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-sm font-semibold text-amber-800">
              Lectura operativa degradada
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-700">
              OpenCore mantuvo la vista disponible, pero no pudo recuperar los casos
              normalizados en este intento.
            </p>
          </section>
        </div>
      ) : null}

      <CasosBoardClient
        casos={items}
        totalCasos={meta.total}
        busquedaInicial={busquedaInicial}
      />

      {lecturaDegradada ? (
        <div className="px-5 pb-8 xl:px-9">
          <section className="mx-auto max-w-[1215px] rounded-lg border border-[#e6e9ef] bg-white px-5 py-4">
            <p className="text-sm text-[#536174]">
              Puedes recargar para reintentar la lectura o crear un caso nuevo mientras
              vuelve la conexion.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center rounded-lg border border-[#e6e9ef] px-4 text-sm font-medium text-[#242b37]"
              >
                Ver dashboard
              </Link>
              <Link
                href="/casos/nuevo"
                className="inline-flex h-10 items-center rounded-lg bg-[#2563eb] px-4 text-sm font-medium text-white"
              >
                Crear caso
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
