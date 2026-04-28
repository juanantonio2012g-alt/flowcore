import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import {
  mapClienteDetalleFromHost,
  type HostClienteDetalleReadModel,
} from "../adapter/mapClienteDetalleFromHost";
import { derivarClienteDetalleReadModel } from "../derivarClienteDetalleReadModel";

type ClienteRecord = {
  id: string;
  nombre: string;
  empresa: string | null;
};

type SeguimientoRecord = {
  id: string;
  caso_id: string;
  fecha: string | null;
  resultado: string | null;
  created_at: string | null;
};

type CotizacionRecord = {
  id: string;
  caso_id: string;
  estado: string | null;
  monto: number | null;
  created_at: string | null;
};

export async function getClienteDetalleReadModel(id: string) {
  if (!id) {
    throw new Error("id es obligatorio");
  }

  const supabase = createServerSupabaseClient();
  const casos = await getCasosNormalizados();

  const clienteCasos = casos.items.filter((caso) => caso.cliente_id === id);
  const casoIds = clienteCasos.map((caso) => caso.id);

  const [
    { data: clienteData, error: clienteError },
    { data: seguimientosData, error: seguimientosError },
    { data: cotizacionesData, error: cotizacionesError },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nombre, empresa").eq("id", id).maybeSingle(),
    casoIds.length === 0
      ? Promise.resolve({ data: [] as SeguimientoRecord[], error: null })
      : supabase
          .from("seguimientos")
          .select("id, caso_id, fecha, resultado, created_at")
          .in("caso_id", casoIds)
          .order("created_at", { ascending: false })
          .limit(20),
    casoIds.length === 0
      ? Promise.resolve({ data: [] as CotizacionRecord[], error: null })
      : supabase
          .from("cotizaciones")
          .select("id, caso_id, estado, monto, created_at")
          .in("caso_id", casoIds)
          .order("created_at", { ascending: false })
          .limit(20),
  ]);

  if (clienteError) {
    throw new Error(clienteError.message);
  }
  if (!clienteData) {
    return null;
  }
  if (seguimientosError) {
    throw new Error(seguimientosError.message);
  }
  if (cotizacionesError) {
    throw new Error(cotizacionesError.message);
  }

  const host = mapClienteDetalleFromHost({
    cliente: clienteData as ClienteRecord,
    seguimientos: (seguimientosData ?? []) as SeguimientoRecord[],
    cotizaciones: (cotizacionesData ?? []) as CotizacionRecord[],
  } satisfies HostClienteDetalleReadModel);

  return derivarClienteDetalleReadModel({
    host,
    casos: clienteCasos,
  });
}
