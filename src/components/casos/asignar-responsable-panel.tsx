"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PersonaAsignable = {
  id: string;
  nombre: string;
};

type AsignarResponsableProps = {
  casoId: string;
  responsableHumanoId: string | null;
  responsableHumanoNombre: string | null;
  actor: string;
  personas: PersonaAsignable[];
};

export function AsignarResponsablePanelDetalle({
  casoId,
  responsableHumanoId,
  responsableHumanoNombre,
  actor,
  personas,
}: AsignarResponsableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ejecutarAsignacion = async (responsableHumanoIdNuevo: string | null) => {
    setLoadingId(responsableHumanoIdNuevo ?? "desasignar");
    setError(null);

    try {
      const response = await fetch("/api/casos/asignar-responsable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caso_id: casoId,
          payload: {
            responsable_humano_id: responsableHumanoIdNuevo,
          },
          actor,
        }),
      });
      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.error ??
            data?.data?.errores?.[0]?.mensaje ??
            "No se pudo actualizar el responsable humano."
        );
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mt-5 border-t border-[#edf0f4] pt-5">
      <p className="text-[13px] font-semibold text-[#536174]">
        Asignación humana
      </p>
      <p className="mt-2 text-[14px] text-[#242b37]">
        {responsableHumanoNombre ?? "Sin asignar"}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {personas.map((persona) => {
          const activo = persona.id === responsableHumanoId;
          return (
            <button
              key={persona.id}
              type="button"
              onClick={() => ejecutarAsignacion(persona.id)}
              disabled={Boolean(loadingId) || activo}
              className={[
                "inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-[13px] font-medium transition",
                activo
                  ? "border-[#2563eb] bg-[#eef4ff] text-[#2563eb]"
                  : "border-[#e4e8ef] bg-white text-[#242b37] hover:bg-[#f4f6f9]",
                loadingId ? "opacity-70" : "",
              ].join(" ")}
            >
              {loadingId === persona.id ? "Asignando..." : persona.nombre}
            </button>
          );
        })}

        {responsableHumanoId ? (
          <button
            type="button"
            onClick={() => ejecutarAsignacion(null)}
            disabled={Boolean(loadingId)}
            className="inline-flex min-h-9 items-center rounded-lg border border-[#e4e8ef] bg-white px-3 py-1.5 text-[13px] font-medium text-[#6b7688] transition hover:bg-[#f4f6f9]"
          >
            {loadingId === "desasignar" ? "Desasignando..." : "Desasignar"}
          </button>
        ) : null}
      </div>

      {personas.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#6b7688]">
          No hay personas disponibles para la macroárea actual.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-[12.5px] text-[#de3b3b]">{error}</p> : null}
    </div>
  );
}
