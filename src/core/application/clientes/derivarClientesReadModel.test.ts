import { describe, expect, it } from "vitest";
import { derivarClientesReadModel } from "./derivarClientesReadModel";
import type { GetCasosNormalizadosResult } from "@/core/application/casos";

function crearCaso(
  partial: Partial<GetCasosNormalizadosResult["items"][number]>
): GetCasosNormalizadosResult["items"][number] {
  return {
    id: partial.id ?? "caso-1",
    cliente_id: partial.cliente_id ?? "cliente-1",
    cliente: partial.cliente ?? "Cliente Uno",
    proyecto: partial.proyecto ?? "Empresa Uno",
    created_at: partial.created_at ?? "2099-01-01T00:00:00.000Z",
    prioridad: partial.prioridad ?? "media",
    estado_tecnico_real: partial.estado_tecnico_real ?? "en_proceso",
    estado_comercial_real: partial.estado_comercial_real ?? "en_proceso",
    proxima_accion_real: partial.proxima_accion_real ?? "Dar seguimiento comercial",
    proxima_fecha_real: partial.proxima_fecha_real ?? "2099-01-05T00:00:00.000Z",
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? "En seguimiento",
    requiere_validacion: partial.requiere_validacion ?? false,
    recomendacion_accion:
      partial.recomendacion_accion ?? "Dar seguimiento comercial",
    recomendacion_urgencia: partial.recomendacion_urgencia ?? "media",
    recomendacion_motivo:
      partial.recomendacion_motivo ?? "Mantener continuidad operativa.",
    recomendacion_fecha:
      partial.recomendacion_fecha ?? "2099-01-04T00:00:00.000Z",
    workflow_etapa_actual: partial.workflow_etapa_actual ?? "cotizacion",
    workflow_continuidad_estado:
      partial.workflow_continuidad_estado ?? "al_dia",
    workflow_alineacion_sla:
      partial.workflow_alineacion_sla ?? "coherente",
    workflow_transicion_estado:
      partial.workflow_transicion_estado ?? "habilitada",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 2,
    macroarea_motivo: partial.macroarea_motivo ?? "Seguimiento comercial activo.",
    nivel_confianza_cliente: partial.nivel_confianza_cliente ?? "medio",
    nivel_friccion_cliente: partial.nivel_friccion_cliente ?? "medio",
    probabilidad_conversion: partial.probabilidad_conversion ?? "alto",
  };
}

describe("core/application/clientes/derivarClientesReadModel", () => {
  it("agrupa clientes como proyeccion relacional de casos normalizados", () => {
    const casos: GetCasosNormalizadosResult = {
      items: [
        crearCaso({
          id: "caso-1",
          cliente_id: "cliente-1",
          cliente: "Cliente Uno",
          proyecto: "Empresa Uno",
          riesgo: "alto",
          nivel_friccion_cliente: "alto",
          probabilidad_conversion: "medio",
        }),
        crearCaso({
          id: "caso-2",
          cliente_id: "cliente-1",
          cliente: "Cliente Uno",
          proyecto: "Empresa Uno",
          estado_comercial_real: "aprobado",
          riesgo: "bajo",
          nivel_friccion_cliente: "medio",
          probabilidad_conversion: "alto",
        }),
        crearCaso({
          id: "caso-3",
          cliente_id: "cliente-2",
          cliente: "Cliente Dos",
          proyecto: "Empresa Dos",
          riesgo: "medio",
          nivel_friccion_cliente: "bajo",
          probabilidad_conversion: "bajo",
        }),
      ],
      meta: {
        total: 3,
        riesgo_alto: 1,
        sin_proxima_fecha: 0,
        sin_proxima_accion: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
      bulk_items: [],
    };

    const readModel = derivarClientesReadModel(casos);

    expect(readModel.resumen.total).toBe(2);
    expect(readModel.resumen.con_casos_activos).toBe(2);
    expect(readModel.resumen.con_riesgo).toBe(1);
    expect(readModel.items[0]?.id).toBe("cliente-1");
    expect(readModel.items[0]?.total_casos).toBe(2);
    expect(readModel.items[0]?.foco_operativo?.ownership_operativo).toBe("Comercial");
    expect(readModel.items[0]?.foco_operativo?.semantica.etapa_label).toBe("Cotización");
    expect(readModel.items[0]?.foco_operativo?.semantica.estado_contexto_label).toBe(
      "Fase normal del flujo"
    );
    expect(readModel.metadata.total_casos_base).toBe(3);
  });
});
