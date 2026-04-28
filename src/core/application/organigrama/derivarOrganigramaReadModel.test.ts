import { describe, expect, it } from "vitest";
import { derivarOrganigramaReadModel } from "./derivarOrganigramaReadModel";
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
    proxima_accion_real:
      partial.proxima_accion_real !== undefined
        ? partial.proxima_accion_real
        : "Dar seguimiento comercial",
    proxima_fecha_real:
      partial.proxima_fecha_real !== undefined
        ? partial.proxima_fecha_real
        : "2099-01-05T00:00:00.000Z",
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

describe("core/application/organigrama/derivarOrganigramaReadModel", () => {
  it("deriva macroareas estructurales desde casos normalizados", () => {
    const casos: GetCasosNormalizadosResult = {
      items: [
        crearCaso({
          id: "caso-ops",
          macroarea_actual: "operaciones",
          macroarea_label: "Operaciones",
          macroarea_orden: 0,
          riesgo: "alto",
          proxima_accion_real: null,
          proxima_fecha_real: null,
          workflow_etapa_actual: "auditoria",
          workflow_continuidad_estado: "bloqueada",
          workflow_transicion_estado: "bloqueada",
        }),
        crearCaso({
          id: "caso-tec",
          macroarea_actual: "tecnico",
          macroarea_label: "Técnico",
          macroarea_orden: 1,
          requiere_validacion: true,
          workflow_etapa_actual: "diagnostico",
        }),
      ],
      meta: {
        total: 2,
        riesgo_alto: 1,
        sin_proxima_fecha: 1,
        sin_proxima_accion: 1,
        validacion_pendiente: 1,
        orden_default_aplicado: "worklist_operativa",
      },
      bulk_items: [],
    };

    const readModel = derivarOrganigramaReadModel(casos);

    expect(readModel.resumen.total_casos).toBe(2);
    expect(readModel.resumen.bloqueados).toBeGreaterThanOrEqual(2);
    expect(readModel.flujo.tramos[0]?.key).toBe("entrada_control_inicial");
    expect(readModel.flujo.tramos[0]?.responsable_label).toBe("Operaciones");
    expect(readModel.flujo.tramos.find((item) => item.key === "auditoria")?.total_casos).toBe(1);
    expect(readModel.flujo.tramos.find((item) => item.key === "auditoria")?.incidencias).toBe(1);
    expect(readModel.flujo.tramos.find((item) => item.key === "diagnostico")?.responsable_key).toBe(
      "tecnico"
    );
    expect(readModel.flujo.tramos.find((item) => item.key === "diagnostico")?.total_casos).toBe(1);
    expect(readModel.macroareas[0]?.key).toBe("operaciones");
    expect(readModel.macroareas[0]?.submodulos.length).toBeGreaterThan(0);
    expect(readModel.macroareas[0]?.submodulos[0]?.tipo).toBe("estructural");
    expect(readModel.macroareas[0]?.submodulos[0]?.estado_label).toBe("Estructural");
    expect(readModel.macroareas[0]?.foco_actual?.etapa_label).toBe("Auditoría");
    expect(readModel.macroareas[0]?.foco_actual?.accion_actual).toBe("Sin próxima acción");
    expect(readModel.macroareas[0]?.foco_actual?.estado_contexto).toBe("incidencia");
    expect(readModel.macroareas.find((item) => item.key === "tecnico")?.delegacion).toBeTruthy();
  });
});
