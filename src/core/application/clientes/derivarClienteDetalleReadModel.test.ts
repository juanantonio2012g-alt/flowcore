import { describe, expect, it } from "vitest";
import { derivarClienteDetalleReadModel } from "./derivarClienteDetalleReadModel";
import { mapClienteDetalleFromHost } from "./adapter/mapClienteDetalleFromHost";
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
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
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
    workflow_etapa_actual: partial.workflow_etapa_actual ?? "gestion_comercial",
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
    nivel_friccion_cliente: partial.nivel_friccion_cliente ?? "alto",
    desgaste_operativo: partial.desgaste_operativo ?? "medio",
    claridad_intencion: partial.claridad_intencion ?? "medio",
    probabilidad_conversion: partial.probabilidad_conversion ?? "alto",
    observacion_relacional:
      partial.observacion_relacional ?? "Cliente con oportunidad clara de avance.",
  };
}

describe("core/application/clientes/derivarClienteDetalleReadModel", () => {
  it("deriva un estado tactico de cliente sin recalcular dominio del caso", () => {
    const host = mapClienteDetalleFromHost({
      cliente: {
        id: "cliente-1",
        nombre: "Cliente Uno",
        empresa: "Empresa Uno",
      },
      seguimientos: [
        {
          id: "seg-1",
          caso_id: "caso-1",
          fecha: "2099-01-06T00:00:00.000Z",
          resultado: "Cliente contactado",
          created_at: "2099-01-06T00:00:00.000Z",
        },
      ],
      cotizaciones: [],
    });

    const readModel = derivarClienteDetalleReadModel({
      host,
      casos: [
        crearCaso({
          id: "caso-1",
          riesgo: "alto",
          requiere_validacion: true,
          recomendacion_accion: "Revisar estrategia",
        }),
        crearCaso({
          id: "caso-2",
          proxima_fecha_real: null,
          observacion_relacional: "-",
          probabilidad_conversion: "medio",
        }),
      ],
    });

    expect(readModel.cliente.id).toBe("cliente-1");
    expect(readModel.resumen.total_casos).toBe(2);
    expect(readModel.resumen.en_riesgo).toBe(1);
    expect(readModel.estado_relacional.prioridad_relacional).toBe("Alta");
    expect(readModel.casos).toHaveLength(2);
    expect(readModel.casos[0]?.ownership_operativo).toBe("Comercial");
    expect(readModel.casos[0]?.semantica_operativa.etapa_label).toBe(
      "Gestión comercial"
    );
    expect(readModel.casos[0]?.semantica_operativa.estado_contexto_label).toBe(
      "Fase normal del flujo"
    );
    expect(readModel.actividad.length).toBeGreaterThan(0);
    expect(readModel.intervenciones.length).toBeGreaterThan(0);
    expect(readModel.bulk_items).toHaveLength(2);
  });
});
