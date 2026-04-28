type HostClienteRecord = {
  id: string;
  nombre: string;
  empresa: string | null;
};

type HostSeguimientoRecord = {
  id: string;
  caso_id: string;
  fecha: string | null;
  resultado: string | null;
  created_at: string | null;
};

type HostCotizacionRecord = {
  id: string;
  caso_id: string;
  estado: string | null;
  monto: number | null;
  created_at: string | null;
};

export type HostClienteDetalleReadModel = {
  cliente: HostClienteRecord;
  seguimientos: HostSeguimientoRecord[];
  cotizaciones: HostCotizacionRecord[];
};

function textoONull(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio || null;
}

export type ClienteDetalleHostInput = {
  cliente: {
    id: string;
    nombre: string;
    empresa: string | null;
  };
  seguimientos: Array<{
    id: string;
    caso_id: string;
    fecha: string | null;
    resultado: string | null;
    created_at: string | null;
  }>;
  cotizaciones: Array<{
    id: string;
    caso_id: string;
    estado: string | null;
    monto: number | null;
    created_at: string | null;
  }>;
};

export function mapClienteDetalleFromHost(
  host: HostClienteDetalleReadModel
): ClienteDetalleHostInput {
  return {
    cliente: {
      id: host.cliente.id,
      nombre: host.cliente.nombre,
      empresa: textoONull(host.cliente.empresa),
    },
    seguimientos: host.seguimientos.map((item) => ({
      id: item.id,
      caso_id: item.caso_id,
      fecha: item.fecha,
      resultado: textoONull(item.resultado),
      created_at: item.created_at,
    })),
    cotizaciones: host.cotizaciones.map((item) => ({
      id: item.id,
      caso_id: item.caso_id,
      estado: textoONull(item.estado),
      monto: item.monto,
      created_at: item.created_at,
    })),
  };
}
