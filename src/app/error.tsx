"use client";

import Link from "next/link";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
      <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          OpenCore
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">
          No se pudo completar esta navegación
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          La aplicación encontró un error inesperado al cargar esta vista. Puedes
          reintentar o volver a una sección estable.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-slate-500">
            Referencia: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-white"
          >
            Reintentar
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Ir al dashboard
          </Link>
          <Link
            href="/casos"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            Volver a casos
          </Link>
        </div>
      </section>
    </main>
  );
}
