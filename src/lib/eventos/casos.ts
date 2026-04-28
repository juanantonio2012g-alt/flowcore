import type { AlertaTaxonomica } from "@/lib/domain/casos";

export type EventoBase = {
  tipo:
    | "caso"
    | "informe"
    | "diagnostico"
    | "cotizacion"
    | "seguimiento"
    | "alerta";
  titulo: string;
  detalle: string;
  fecha: string | null;
  casoId: string;
  clienteId?: string | null;
  nivel?: "info" | "warning" | "critical";
  taxonomia?: AlertaTaxonomica | null;
};

type CasoInput = {
  id: string;
  created_at?: string | null;
  clientes?: {
    id?: string;
  } | null;
};

type InformeInput = {
  id: string;
  created_at?: string | null;
  estado_revision?: string | null;
};

type DiagnosticoInput = {
  id: string;
  created_at?: string | null;
  categoria_caso?: string | null;
  requiere_validacion?: boolean | null;
};

type CotizacionInput = {
  id: string;
  created_at?: string | null;
  estado?: string | null;
};

type SeguimientoInput = {
  id: string;
  created_at?: string | null;
  fecha?: string | null;
  resultado?: string | null;
};

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function construirEventosCaso(args: {
  caso: CasoInput;
  informe?: InformeInput | null;
  diagnostico?: DiagnosticoInput | null;
  cotizacion?: CotizacionInput | null;
  seguimiento?: SeguimientoInput | null;
  alertas?: Array<{
    titulo: string;
    detalle: string;
    fecha?: string | null;
    nivel?: "info" | "warning" | "critical";
    taxonomia?: AlertaTaxonomica | null;
  }>;
}) {
  const { caso, informe, diagnostico, cotizacion, seguimiento, alertas = [] } = args;

  const eventos: EventoBase[] = [
    {
      tipo: "caso",
      titulo: "Caso creado",
      detalle: "Se registró el caso en el sistema.",
      fecha: caso.created_at ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel: "info",
    },
  ];

  if (informe) {
    eventos.push({
      tipo: "informe",
      titulo: "Informe técnico agregado",
      detalle: informe.estado_revision
        ? `Estado de revisión: ${formatearTexto(informe.estado_revision)}`
        : "Informe técnico registrado.",
      fecha: informe.created_at ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel: "info",
    });
  }

  if (diagnostico) {
    eventos.push({
      tipo: "diagnostico",
      titulo: "Diagnóstico registrado",
      detalle: diagnostico.categoria_caso
        ? `Categoría: ${formatearTexto(diagnostico.categoria_caso)}`
        : "Diagnóstico técnico registrado.",
      fecha: diagnostico.created_at ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel: diagnostico.requiere_validacion ? "warning" : "info",
    });
  }

  if (cotizacion) {
    eventos.push({
      tipo: "cotizacion",
      titulo: "Cotización registrada",
      detalle: cotizacion.estado
        ? `Estado: ${formatearTexto(cotizacion.estado)}`
        : "Cotización registrada.",
      fecha: cotizacion.created_at ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel:
        cotizacion.estado === "rechazado" || cotizacion.estado === "rechazada"
          ? "critical"
          : "info",
    });
  }

  if (seguimiento) {
    eventos.push({
      tipo: "seguimiento",
      titulo: "Seguimiento registrado",
      detalle: seguimiento.resultado || "Seguimiento comercial registrado.",
      fecha: seguimiento.created_at ?? seguimiento.fecha ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel: "info",
    });
  }

  for (const alerta of alertas) {
    eventos.push({
      tipo: "alerta",
      titulo: alerta.titulo,
      detalle: alerta.detalle,
      fecha: alerta.fecha ?? null,
      casoId: caso.id,
      clienteId: caso.clientes?.id ?? null,
      nivel: alerta.nivel ?? "warning",
      taxonomia: alerta.taxonomia ?? null,
    });
  }

  return eventos.sort((a, b) => {
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });
}

export function filtrarEventosPorCliente(
  eventos: EventoBase[],
  clienteId: string
) {
  return eventos.filter((evento) => evento.clienteId === clienteId);
}

export function filtrarEventosPorCaso(
  eventos: EventoBase[],
  casoId: string
) {
  return eventos.filter((evento) => evento.casoId === casoId);
}
