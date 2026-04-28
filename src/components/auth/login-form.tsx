"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function resolveRedirectTarget(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/dashboard";
  }

  return nextPath;
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const redirectTarget = resolveRedirectTarget(searchParams.get("next"));

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.replace(redirectTarget);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo iniciar sesión en OpenCore."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          Correo electrónico
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tucorreo@empresa.com"
          className="oc-input"
          autoComplete="email"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-200">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="oc-input"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-xs leading-5 text-slate-400">
        Acceso autenticado por Supabase. Comparte con el cliente solo el usuario
        demo que prepares para esta instancia.
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="oc-button w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
