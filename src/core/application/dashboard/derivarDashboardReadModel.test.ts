import { describe, expect, it } from "vitest";
import { derivarDashboardReadModel } from "./derivarDashboardReadModel";
import type { DerivarDashboardReadModelInput } from "./contracts";

function crearCaso(
  partial: Partial<DerivarDashboardReadModelInput["items"][number]>
): DerivarDashboardReadModelInput["items"][number] {
  return {
    id: partial.id ?? "caso-1",
    cliente_id: partial.cliente_id ?? "cliente-1",
    cliente: partial.cliente ?? "Cliente Uno",
    proyecto: partial.proyecto ?? "Proyecto Uno",
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
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 2,
    macroarea_motivo: partial.macroarea_motivo ?? "Seguimiento comercial activo.",
    nivel_confianza_cliente: partial.nivel_confianza_cliente ?? "medio",
    nivel_friccion_cliente: partial.nivel_friccion_cliente ?? "bajo",
    desgaste_operativo: partial.desgaste_operativo ?? "bajo",
    claridad_intencion: partial.claridad_intencion ?? "media",
    probabilidad_conversion: partial.probabilidad_conversion ?? "medio",
    observacion_relacional: partial.observacion_relacional ?? "",
    created_at: partial.created_at ?? "2099-01-01T00:00:00.000Z",
  };
}

describe("core/application/dashboard/derivarDashboardReadModel", () => {
  it("agrega el dashboard desde casos normalizados sin recalcular dominio", () => {
    const input: DerivarDashboardReadModelInput = {
      items: [
        crearCaso({
          id: "caso-alto",
          riesgo: "alto",
          prioridad: "urgente",
          requiere_validacion: true,
          macroarea_actual: "tecnico",
          macroarea_label: "Técnico",
          macroarea_orden: 1,
          proxima_accion_real: null,
          proxima_fecha_real: null,
        }),
        crearCaso({
          id: "caso-bajo",
          cliente_id: "cliente-2",
          cliente: "Cliente Dos",
          proyecto: "Proyecto Dos",
          riesgo: "bajo",
          estado_comercial_real: "aprobado",
          macroarea_actual: "comercial",
          macroarea_label: "Comercial",
        }),
      ],
      meta: {
        total: 2,
        riesgo_alto: 1,
        validacion_pendiente: 1,
        orden_default_aplicado: "worklist_operativa",
      },
    };

    const readModel = derivarDashboardReadModel(input);

    expect(readModel.resumen.activos).toBe(2);
    expect(readModel.resumen.riesgo_alto).toBe(1);
    expect(readModel.resumen.validaciones_pendientes).toBe(1);
    expect(readModel.sintesis.estado_general).toBe("Supervisión exigente");
    expect(readModel.sintesis.pendiente_principal.modo).toBe("individual");
    expect(readModel.sintesis.pendiente_principal.titulo).toContain("Cliente Uno");
    expect(readModel.resumen_lecturas.riesgo_alto).toContain("riesgo alto");
    expect(readModel.resumen_lecturas.activos).toContain("atención operativa");
    expect(readModel.decisiones).toHaveLength(4);
    expect(readModel.decisiones[0]?.key).toBe("prioridad");
    expect(readModel.decisiones[0]?.decision).toContain("Priorizar");
    expect(readModel.decisiones[2]?.key).toBe("orden");
    expect(readModel.foco_contexto.modo).toBe("individual");
    expect(readModel.foco_contexto.titulo).toBe("Caso prioritario actual");
    expect(readModel.foco[0]?.id).toBe("caso-alto");
    expect(readModel.foco[0]?.semantica.etapa_label).toBe("Etapa activa");
    expect(readModel.foco[0]?.semantica.estado_contexto_label).toBe(
      "Fase normal del flujo"
    );
    expect(readModel.clientes_resumen.titulo).toBe("Clientes prioritarios");
    expect(readModel.clientes_resumen.descripcion).toContain("atención");
    expect(readModel.clientes[0]?.motivo_foco).toBeDefined();
    expect(readModel.actividad_resumen.titulo).toBe("Actividad reciente resumida");
    expect(readModel.clientes).toHaveLength(2);
    expect(readModel.actividad.length).toBeGreaterThan(0);
    expect(readModel.metadata.orden_base).toBe("worklist_operativa");
  });

  it("escala a modo agregado cuando varios casos explican la misma presion", () => {
    const input: DerivarDashboardReadModelInput = {
      items: [
        crearCaso({
          id: "caso-1",
          cliente: "Cliente Uno",
          riesgo: "alto",
          macroarea_actual: "tecnico",
          macroarea_label: "Técnico",
          macroarea_orden: 1,
        }),
        crearCaso({
          id: "caso-2",
          cliente: "Cliente Dos",
          riesgo: "alto",
          macroarea_actual: "tecnico",
          macroarea_label: "Técnico",
          macroarea_orden: 1,
          proxima_fecha_real: "2099-01-04T00:00:00.000Z",
        }),
      ],
      meta: {
        total: 2,
        riesgo_alto: 2,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
    };

    const readModel = derivarDashboardReadModel(input);

    expect(readModel.sintesis.pendiente_principal.modo).toBe("agregado");
    if (readModel.sintesis.pendiente_principal.modo === "agregado") {
      expect(readModel.sintesis.pendiente_principal.cantidad_casos).toBe(2);
      expect(readModel.sintesis.pendiente_principal.macroarea_label).toBe("Técnico");
      expect(readModel.sintesis.pendiente_principal.descripcion).toContain(
        "antes de abrir nuevos frentes"
      );
    }
    expect(readModel.decisiones[1]?.key).toBe("concentracion");
    expect(readModel.decisiones[1]?.decision).toContain("Concentrar atención");
    expect(readModel.foco_contexto.modo).toBe("agregado");
  });

  it("expone señales relacionales taxonomizadas en la actividad del dashboard", () => {
    const input: DerivarDashboardReadModelInput = {
      items: [
        crearCaso({
          id: "caso-relacional",
          nivel_friccion_cliente: "alta",
          desgaste_operativo: "alto",
          claridad_intencion: "media",
          probabilidad_conversion: "media",
        }),
      ],
      meta: {
        total: 1,
        riesgo_alto: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
    };

    const readModel = derivarDashboardReadModel(input);
    const alertaRelacional = readModel.actividad.find(
      (item) => item.titulo === "Vínculo en tensión"
    );

    expect(alertaRelacional).toBeDefined();
    expect(alertaRelacional?.taxonomia?.dimension).toBe("relacional");
    expect(alertaRelacional?.taxonomia?.origen_causal).toBe("mixto");
    expect(alertaRelacional?.taxonomia?.proposito).toBe("calidad_vinculo");
  });

  it("usa una lectura ejecutiva más directa cuando no hay presión crítica", () => {
    const input: DerivarDashboardReadModelInput = {
      items: [crearCaso({ riesgo: "bajo" })],
      meta: {
        total: 1,
        riesgo_alto: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
    };

    const readModel = derivarDashboardReadModel(input);

    expect(readModel.sintesis.presion_dominante).toBe(
      "La operación avanza sin frentes críticos inmediatos."
    );
    expect(readModel.decisiones[3]?.key).toBe("espera");
    expect(readModel.decisiones[3]?.decision).toContain("postergar atención");
  });
});
