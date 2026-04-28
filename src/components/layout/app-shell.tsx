"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
};

type NavActiveMatch =
  | "dashboard"
  | "casos-list"
  | "casos-detail"
  | "clientes"
  | "organigrama"
  | "none";

const hiddenShellRoutes = ["/", "/login"];

const navItems: Array<{
  href: string;
  label: string;
  description: string;
  icon: "home" | "case" | "clients" | "org" | "tasks" | "reports" | "settings";
  activeMatch: NavActiveMatch;
}> = [
  {
    href: "/dashboard",
    label: "Inicio",
    description: "Vista general",
    icon: "home",
    activeMatch: "dashboard",
  },
  {
    href: "/casos",
    label: "Casos",
    description: "Seguimiento operativo",
    icon: "case",
    activeMatch: "casos-list",
  },
  {
    href: "/clientes",
    label: "Clientes",
    description: "Cartera y contexto",
    icon: "clients",
    activeMatch: "clientes",
  },
  {
    href: "/casos",
    label: "Tareas",
    description: "Pendientes",
    icon: "tasks",
    activeMatch: "none",
  },
  {
    href: "/dashboard",
    label: "Reportes",
    description: "Resumen mensual",
    icon: "reports",
    activeMatch: "none",
  },
  {
    href: "/organigrama",
    label: "Organigrama",
    description: "Ownership y estructura",
    icon: "org",
    activeMatch: "organigrama",
  },
  {
    href: "/organigrama",
    label: "Configuración",
    description: "Preferencias",
    icon: "settings",
    activeMatch: "none",
  },
];

function isActive(
  pathname: string,
  activeMatch: NavActiveMatch
) {
  switch (activeMatch) {
    case "dashboard":
      return pathname === "/dashboard";
    case "casos-list":
      return pathname === "/casos" || pathname.startsWith("/casos/");
    case "casos-detail":
      return pathname.startsWith("/casos/") && pathname !== "/casos";
    case "clientes":
      return pathname.startsWith("/clientes");
    case "organigrama":
      return pathname === "/organigrama";
    case "none":
      return false;
  }
}

function getRouteTitle(pathname: string) {
  if (pathname === "/casos/nuevo") {
    return {
      eyebrow: "Nuevo caso",
      title: "Nuevo caso",
      description: "Captura inicial para ingresar un caso limpio a la operación.",
    };
  }

  if (pathname.startsWith("/casos/") && pathname !== "/casos/nuevo") {
    return {
      eyebrow: "Caso operativo",
      title: "Vista integral del caso",
      description: "Continuidad, ownership, expediente y trazabilidad sobre una misma lectura.",
    };
  }

  if (pathname.startsWith("/casos")) {
    return {
      eyebrow: "Worklist",
      title: "Cola global de trabajo",
      description: "Prioriza qué mover, qué corregir y qué escalar sin perder continuidad.",
    };
  }

  if (pathname.startsWith("/clientes")) {
    return {
      eyebrow: "Clientes",
      title: "Vista relacional",
      description: "Lectura consolidada por cliente, contexto comercial y actividad.",
    };
  }

  if (pathname.startsWith("/organigrama")) {
    return {
      eyebrow: "Organización",
      title: "Mapa operativo",
      description: "Ownership por macroárea y lectura estructural del flujo del caso.",
    };
  }

  return {
    eyebrow: "OpenCore",
    title: "Inicio",
    description: "Centro de operaciones",
  };
}

function buildInitials(value: string) {
  const base = value.includes("@") ? value.split("@")[0] : value;
  const cleaned = base
    .replace(/[^a-zA-Z0-9\s._-]/g, " ")
    .trim();
  const parts = cleaned.split(/[\s._-]+/).filter(Boolean);

  if (parts.length === 0) {
    return "OC";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavIcon({ type }: { type: (typeof navItems)[number]["icon"] }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (type === "home") {
    return (
      <svg {...common}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10.5V19h11v-8.5" />
        <path d="M10 19v-5h4v5" />
      </svg>
    );
  }

  if (type === "case") {
    return (
      <svg {...common}>
        <path d="M7 3.8h6.4L18 8.4v11.8H7z" />
        <path d="M13.4 3.8v4.6H18" />
        <path d="M9.8 12h4.4" />
        <path d="M9.8 15.5h5.6" />
      </svg>
    );
  }

  if (type === "clients") {
    return (
      <svg {...common}>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M19 18a3.6 3.6 0 0 0-2.2-3.1" />
        <path d="M17 7a2.5 2.5 0 0 1 0 5" />
      </svg>
    );
  }

  if (type === "org") {
    return (
      <svg {...common}>
        <path d="M12 5v5" />
        <path d="M6 14v-4h12v4" />
        <path d="M4 18h4v3H4z" />
        <path d="M10 18h4v3h-4z" />
        <path d="M16 18h4v3h-4z" />
        <path d="M10 3h4v4h-4z" />
      </svg>
    );
  }

  if (type === "tasks") {
    return (
      <svg {...common}>
        <path d="M5 12.5 8.2 16 19 6" />
        <path d="M5 5h9" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  if (type === "reports") {
    return (
      <svg {...common}>
        <path d="M5 20V9" />
        <path d="M12 20V5" />
        <path d="M19 20v-7" />
        <path d="M4 20h16" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19 13.5v-3l-2.1-.5a7 7 0 0 0-.7-1.6l1.1-1.9-2.1-2.1-1.9 1.1a7 7 0 0 0-1.6-.7L11.2 2H8.8l-.5 2.1a7 7 0 0 0-1.6.7L4.8 3.7 2.7 5.8l1.1 1.9a7 7 0 0 0-.7 1.6L1 9.8v3l2.1.5c.2.6.4 1.1.7 1.6l-1.1 1.9 2.1 2.1 1.9-1.1c.5.3 1 .5 1.6.7l.5 2.1h2.4l.5-2.1c.6-.2 1.1-.4 1.6-.7l1.9 1.1 2.1-2.1-1.1-1.9c.3-.5.5-1 .7-1.6l2.1-.5Z" />
    </svg>
  );
}

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [busqueda, setBusqueda] = useState("");
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    let active = true;

    async function syncUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) {
        return;
      }

      setUserEmail(user?.email ?? null);
    }

    void syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (hiddenShellRoutes.includes(pathname)) {
    return <>{children}</>;
  }

  const routeMeta = getRouteTitle(pathname);
  const isCaseDetailHeader =
    pathname.startsWith("/casos/") && pathname !== "/casos/nuevo";
  const caseDetailId = pathname.split("/").filter(Boolean).at(1) ?? "";
  const caseDetailLabel =
    caseDetailId.length > 12 ? `${caseDetailId.slice(0, 8)}` : caseDetailId;
  const userInitials = buildInitials(userEmail ?? "OpenCore");

  async function cerrarSesion() {
    setCerrandoSesion(true);

    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setCerrandoSesion(false);
    }
  }

  function buscar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const termino = busqueda.trim();
    router.push(termino ? `/casos?q=${encodeURIComponent(termino)}` : "/casos");
  }

  return (
    <div className="oc-shell h-dvh overflow-hidden">
      <div className="flex h-full">
        <aside className="hidden h-full w-[255px] shrink-0 border-r border-[color:var(--line)] bg-white xl:flex xl:flex-col">
          <div className="px-7 py-7">
            <Link href="/dashboard" className="block">
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-full border-[5px] border-[#2f74ed]" />
                <span className="text-[1.34rem] font-bold text-slate-900">OpenCore</span>
              </div>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-7">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = isActive(pathname, item.activeMatch);

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    className={[
                      "group flex h-14 items-center gap-4 rounded-lg px-5 text-[15px] transition",
                      active
                        ? "bg-[#eef4ff] text-[#2563eb]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <div className="shrink-0">
                      <NavIcon type={item.icon} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[0.98rem] font-semibold">
                        {item.label}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-[color:var(--line)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-semibold text-[#2563eb]">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {userEmail ?? "Sesión activa"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  Acceso autenticado en OpenCore
                </p>
              </div>
              <button
                type="button"
                onClick={cerrarSesion}
                disabled={cerrandoSesion}
                className="rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cerrandoSesion ? "Saliendo..." : "Salir"}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center border-b border-[color:var(--line)] bg-white px-5 xl:px-8">
            <div
              className={[
                "flex w-full items-center gap-5",
                isCaseDetailHeader ? "justify-between" : "justify-end",
              ].join(" ")}
            >
              <span className="sr-only">{routeMeta.title}</span>
              {isCaseDetailHeader ? (
                <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
                  <Link
                    href="/casos"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    aria-label="Volver a casos"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                  <Link href="/casos" className="font-medium hover:text-slate-900">
                    Casos
                  </Link>
                  <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="truncate font-semibold text-slate-900">
                    #{caseDetailLabel}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center gap-5">
                {isCaseDetailHeader ? (
                  <div className="hidden items-center gap-3 md:flex">
                    <Link
                      href={`${pathname}/seguimiento`}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[color:var(--line)] bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="m4 16 4 4L20 8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="m14 4 6 6" strokeLinecap="round" />
                      </svg>
                      Editar caso
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[color:var(--line)] bg-white text-slate-600 hover:bg-slate-50"
                      aria-label="Más acciones del caso"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.6" />
                        <circle cx="12" cy="12" r="1.6" />
                        <circle cx="12" cy="19" r="1.6" />
                      </svg>
                    </button>
                  </div>
                ) : (
                <form onSubmit={buscar} className="relative hidden w-[400px] lg:block">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
                      <circle cx="11" cy="11" r="7" />
                    </svg>
                  </span>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar casos, clientes, etiquetas..."
                    className="oc-input h-11 rounded-lg pl-12 text-[0.92rem]"
                  />
                </form>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificacionesAbiertas((valor) => !valor)}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white text-slate-500"
                    aria-expanded={notificacionesAbiertas}
                    aria-label="Notificaciones"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M18 16.5H6l1.2-1.6V10a4.8 4.8 0 0 1 9.6 0v4.9L18 16.5Z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
                    </svg>
                  </button>
                  {notificacionesAbiertas ? (
                    <div className="absolute right-0 top-13 z-20 w-72 rounded-lg border border-[color:var(--line)] bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.12)]">
                      <p className="text-sm font-semibold text-slate-900">Notificaciones</p>
                      <p className="mt-2 text-sm text-slate-500">
                        Revisa la cola para ver casos que requieren atención.
                      </p>
                      <Link
                        href="/casos"
                        onClick={() => setNotificacionesAbiertas(false)}
                        className="mt-4 inline-flex text-sm font-semibold text-[#2563eb]"
                      >
                        Abrir cola
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#eef1f7] text-sm font-semibold text-slate-600"
                  title={userEmail ?? "Sesión activa"}
                >
                  {userInitials}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#5ac26b]" />
                </div>
              </div>
            </div>
          </header>

          <main className="oc-page min-h-0 flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
