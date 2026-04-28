"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  casoId: string;
};

export default function GenerarDiagnosticoAgenteButton({ casoId }: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);

  async function generar() {
    try {
      setCargando(true);

      const res = await fetch("/api/agente/diagnostico/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: casoId,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        alert(json?.error || "No se pudo generar el diagnóstico IA");
        return;
      }

      alert(json?.mensaje || "Diagnóstico IA generado");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error generando el diagnóstico IA");
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={generar}
      disabled={cargando}
      className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-60"
    >
      {cargando ? "Generando IA..." : "Generar diagnóstico IA"}
    </button>
  );
}