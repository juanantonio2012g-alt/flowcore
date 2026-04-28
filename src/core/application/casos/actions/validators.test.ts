import { describe, expect, it } from "vitest";
import type { CasoWorklistItem } from "../contracts";
import { validateBulkUpdateCommand } from "./validators";

function buildCaso(partial: Partial<CasoWorklistItem> = {}): CasoWorklistItem {
  return {
    id: partial.id ?? "caso-1",
    cliente_id: partial.cliente_id ?? "cliente-1",
    cliente: partial.cliente ?? "Cliente Uno",
    proyecto: partial.proyecto ?? "Proyecto Uno",
    created_at: partial.created_at ?? "2026-04-02T10:00:00.000Z",
    prioridad: partial.prioridad ?? "alta",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    estado_tecnico_real: partial.estado_tecnico_real ?? "diagnosticado",
    estado_comercial_real: partial.estado_comercial_real ?? "en_proceso",
    proxima_accion_real:
      partial.proxima_accion_real ?? "Dar seguimiento comercial",
    proxima_fecha_real:
      partial.proxima_fecha_real ?? "2026-04-05T00:00:00.000Z",
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? "En plazo",
    requiere_validacion: partial.requiere_validacion ?? false,
    recomendacion_accion:
      partial.recomendacion_accion ?? "Dar seguimiento comercial",
    recomendacion_urgencia: partial.recomendacion_urgencia ?? "media",
    recomendacion_motivo:
      partial.recomendacion_motivo ?? "Continuidad pendiente",
    recomendacion_fecha:
      partial.recomendacion_fecha ?? "2026-04-06T00:00:00.000Z",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    macroarea_motivo: partial.macroarea_motivo ?? "Seguimiento activo",
    nivel_confianza_cliente:
      partial.nivel_confianza_cliente ?? "media",
    nivel_friccion_cliente:
      partial.nivel_friccion_cliente ?? "baja",
    desgaste_operativo: partial.desgaste_operativo ?? "bajo",
    claridad_intencion: partial.claridad_intencion ?? "clara",
    probabilidad_conversion:
      partial.probabilidad_conversion ?? "media",
    observacion_relacional:
      partial.observacion_relacional ?? "Sin observaciones",
  };
}

describe("validateBulkUpdateCommand", () => {
  it("bloquea una actualizacion manual sin payload util", () => {
    const validation = validateBulkUpdateCommand(
      {
        caso_ids: ["caso-1"],
        accion: "actualizacion_manual",
        payload: {},
      },
      [buildCaso()]
    );

    expect(validation.ok).toBe(false);
    expect(validation.errores.some((error) => error.codigo === "payload_vacio")).toBe(true);
  });

  it("bloquea ids que no existen en la coleccion disponible", () => {
    const validation = validateBulkUpdateCommand(
      {
        caso_ids: ["caso-inexistente"],
        accion: "aplicar_sugerencia",
      },
      [buildCaso()]
    );

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some((error) => error.codigo === "caso_no_encontrado")
    ).toBe(true);
  });

  it("acepta una actualizacion manual valida", () => {
    const validation = validateBulkUpdateCommand(
      {
        caso_ids: ["caso-1"],
        accion: "actualizacion_manual",
        payload: {
          proxima_fecha: "2026-04-07",
          estado_comercial: "negociacion",
        },
      },
      [buildCaso()]
    );

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });
});
