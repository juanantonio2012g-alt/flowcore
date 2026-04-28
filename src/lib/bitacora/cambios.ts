import { createClient } from "@/lib/supabase/client";

export type CambioBitacora = {
  caso_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "manual" | "sugerido" | "masivo";
  actor?: string | null;
  created_at?: string;
};

export async function registrarCambiosBitacora(cambios: CambioBitacora[]) {
  if (!cambios.length) return { error: null };

  const supabase = createClient();

  let actor: string | null = "sistema";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    actor = user.email;
  } else if (user?.id) {
    actor = user.id;
  }

  const payload = cambios.map((cambio) => ({
    caso_id: cambio.caso_id,
    campo: cambio.campo,
    valor_anterior: cambio.valor_anterior,
    valor_nuevo: cambio.valor_nuevo,
    origen: cambio.origen,
    actor: cambio.actor ?? actor,
  }));

  const { error } = await supabase.from("bitacora_cambios_caso").insert(payload);
  return { error };
}
