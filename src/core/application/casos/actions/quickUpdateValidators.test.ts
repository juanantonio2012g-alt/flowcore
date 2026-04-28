import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { validateQuickUpdateCommand } from "./quickUpdateValidators";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En plazo",
      descripcion: "SLA dentro de plazo",
    },
    proxima_accion: partial.proxima_accion ?? "Dar seguimiento comercial",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-06",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Preparar cotización",
      urgencia: "media",
      motivo: "Continuidad",
      fecha_sugerida: "2026-04-07",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-02T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "en_proceso",
      requiere_validacion: false,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Seguimiento activo",
    },
  };
}

describe("validateQuickUpdateCommand", () => {
  it("bloquea un comando manual sin cambios", () => {
    const validation = validateQuickUpdateCommand(
      {
        caso_id: "caso-1",
        accion: "actualizacion_manual",
        payload: {},
      },
      buildCaso()
    );

    expect(validation.ok).toBe(false);
    expect(validation.errores.some((error) => error.codigo === "payload_vacio")).toBe(true);
  });

  it("bloquea una sugerencia sin recomendacion operativa", () => {
    const validation = validateQuickUpdateCommand(
      {
        caso_id: "caso-1",
        accion: "aplicar_sugerencia",
      },
      buildCaso({
        recomendacion_operativa: {
          accion: "",
          urgencia: "media",
          motivo: "Sin accion",
          fecha_sugerida: null,
        },
      })
    );

    expect(validation.ok).toBe(false);
    expect(validation.errores.some((error) => error.codigo === "sin_recomendacion")).toBe(true);
  });

  it("acepta una actualizacion manual valida", () => {
    const validation = validateQuickUpdateCommand(
      {
        caso_id: "caso-1",
        accion: "actualizacion_manual",
        payload: {
          proxima_accion: "Validar diagnóstico",
          proxima_fecha: "2026-04-08",
        },
      },
      buildCaso()
    );

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });
});
