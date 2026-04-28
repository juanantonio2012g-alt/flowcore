import { redirect } from "next/navigation";
import LoginForm from "@/components/auth/login-form";
import { getAuthenticatedUser } from "@/lib/supabase/server-auth";

export default async function LoginPage() {
  const user = await getAuthenticatedUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-100">
      <div className="oc-shell-orb oc-shell-orb--gold" />
      <div className="oc-shell-orb oc-shell-orb--cool" />
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[rgba(8,14,25,0.82)] shadow-[0_36px_120px_rgba(1,6,15,0.52)] backdrop-blur xl:grid-cols-[1.05fr,0.95fr]">
        <section className="hidden border-r border-white/8 p-8 xl:flex xl:flex-col xl:justify-between">
          <div>
            <div className="oc-topline">
              <span className="oc-topline-dot" />
              OpenCore Access
            </div>
            <h1 className="oc-display mt-6 max-w-xl text-[3.4rem] text-slate-50">
              La operación entra por una sola puerta.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-slate-300">
              Un entorno de trabajo diseñado para ver presión, continuidad y ownership con
              una lectura ejecutiva mucho más clara que un CRM convencional.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="oc-card-soft px-5 py-4">
              <p className="oc-label">Visibilidad</p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                Dashboard, worklist y expediente en una sola narrativa.
              </p>
            </div>
            <div className="oc-card-soft px-5 py-4">
              <p className="oc-label">Criterio</p>
              <p className="mt-2 text-base font-semibold text-slate-100">
                Riesgo, siguiente acción y continuidad operativa visibles desde el arranque.
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-8 xl:px-10 xl:py-10">
          <div className="oc-topline">
            <span className="oc-topline-dot" />
            Iniciar Sesión
          </div>
          <h2 className="oc-display mt-5 text-[2.35rem] text-slate-50">
            Accede a OpenCore
          </h2>
          <p className="mt-3 max-w-md text-sm text-slate-400">
            Entrada operativa segura para coordinación técnica, comercial y relacional.
          </p>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
