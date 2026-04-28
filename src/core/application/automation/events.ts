import type { BulkUpdateResult, QuickUpdateResult } from "@/core/application/casos";
import type { CotizacionResult } from "@/core/application/casos/expediente/cotizacion";
import type { DiagnosticoResult } from "@/core/application/casos/expediente/diagnostico";
import type { InformeResult } from "@/core/application/casos/expediente/informe";
import type { SeguimientoResult } from "@/core/application/casos/expediente/seguimiento";
import type { DomainEvent } from "./contracts";

function buildCaseWriteEvent(args: {
  name: string;
  casoId: string;
  occurredAt: string;
  source: string;
  payload: Record<string, unknown>;
}): DomainEvent {
  return {
    name: args.name,
    entity: "caso",
    entity_id: args.casoId,
    caso_id: args.casoId,
    occurred_at: args.occurredAt,
    payload: args.payload,
    source: args.source,
    correlation_id: crypto.randomUUID(),
  };
}

export function buildBulkUpdateEvent(
  result: BulkUpdateResult
): DomainEvent | null {
  if (result.total_actualizados === 0) return null;

  return {
    name: "casos.bulk_update.completed",
    entity: "casos",
    entity_id: "bulk",
    caso_id: null,
    occurred_at: result.metadata.timestamp,
    payload: {
      accion: result.accion,
      total_recibidos: result.total_recibidos,
      total_actualizados: result.total_actualizados,
      total_omitidos: result.total_omitidos,
      caso_ids: result.cambios
        .filter((cambio) => cambio.resultado === "actualizado")
        .map((cambio) => cambio.caso_id),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
    source: result.metadata.origen,
    correlation_id: crypto.randomUUID(),
  };
}

export function buildQuickUpdateEvent(
  result: QuickUpdateResult
): DomainEvent | null {
  if (!result.ok || result.cambios.length === 0) return null;

  return buildCaseWriteEvent({
    name: "caso.quick_update.completed",
    casoId: result.caso_id,
    occurredAt: result.metadata.timestamp,
    source: result.metadata.origen,
    payload: {
      accion: result.accion,
      cambios: result.cambios.map((cambio) => cambio.campo),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
  });
}

export function buildSeguimientoEvent(
  result: SeguimientoResult
): DomainEvent | null {
  if (!result.ok) return null;

  return buildCaseWriteEvent({
    name:
      result.accion === "registrar_seguimiento"
        ? "caso.seguimiento.registrado"
        : "caso.seguimiento.actualizado",
    casoId: result.caso_id,
    occurredAt: result.metadata.timestamp,
    source: result.metadata.origen,
    payload: {
      accion: result.accion,
      seguimiento_id: result.seguimiento_id ?? null,
      cambios: result.cambios.map((cambio) => cambio.campo),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
  });
}

export function buildInformeEvent(
  result: InformeResult
): DomainEvent | null {
  if (!result.ok) return null;

  return buildCaseWriteEvent({
    name:
      result.accion === "registrar_informe"
        ? "caso.informe.registrado"
        : "caso.informe.actualizado",
    casoId: result.caso_id,
    occurredAt: result.metadata.timestamp,
    source: result.metadata.origen,
    payload: {
      accion: result.accion,
      informe_id: result.informe_id ?? null,
      cambios: result.cambios.map((cambio) => cambio.campo),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
  });
}

export function buildDiagnosticoEvent(
  result: DiagnosticoResult
): DomainEvent | null {
  if (!result.ok) return null;

  return buildCaseWriteEvent({
    name:
      result.accion === "registrar_diagnostico"
        ? "caso.diagnostico.registrado"
        : "caso.diagnostico.actualizado",
    casoId: result.caso_id,
    occurredAt: result.metadata.timestamp,
    source: result.metadata.origen,
    payload: {
      accion: result.accion,
      diagnostico_id: result.diagnostico_id ?? null,
      cambios: result.cambios.map((cambio) => cambio.campo),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
  });
}

export function buildCotizacionEvent(
  result: CotizacionResult
): DomainEvent | null {
  if (!result.ok) return null;

  return buildCaseWriteEvent({
    name:
      result.accion === "registrar_cotizacion"
        ? "caso.cotizacion.registrada"
        : "caso.cotizacion.actualizada",
    casoId: result.caso_id,
    occurredAt: result.metadata.timestamp,
    source: result.metadata.origen,
    payload: {
      accion: result.accion,
      cotizacion_id: result.cotizacion_id ?? null,
      cambios: result.cambios.map((cambio) => cambio.campo),
      warning_codes: result.advertencias.map((warning) => warning.codigo),
    },
  });
}
