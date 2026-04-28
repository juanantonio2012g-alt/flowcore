import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { resolverInputAgenteIA } from "./resolverInputAgenteIA";

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "diagnostico",
    estado_label: partial.estado_label ?? "Diagnóstico",
    workflow: partial.workflow ?? {
      caso_id: "caso-1",
      version: 1,
      etapa_actual: "diagnostico",
      estado_workflow: "activo",
      etapas: [],
      hitos: [],
      logistica: null,
      auditoria: null,
      postventa: null,
      cierre_tecnico: null,
      continuidad: {
        estado: "al_dia",
        proxima_accion: "Validar diagnóstico humano",
        proxima_fecha: "2026-04-25",
        owner_actual: "tecnico",
        motivo_espera: null,
        origen: "workflow",
      },
      alineacion: {
        expediente_vs_workflow: "alineado",
        continuidad_vs_workflow: "alineada",
        sla_vs_workflow: "coherente",
        alertas: [],
      },
      transiciones: {
        actual: null,
        lista: [],
        bloqueos_activos: [],
        habilitadores_activos: [],
      },
      metadata: {
        created_at: "2026-04-24T00:00:00.000Z",
        updated_at: "2026-04-24T00:00:00.000Z",
        ultima_transicion_at: null,
        ultima_transicion_por: null,
        derivado_desde: ["casos"],
      },
    },
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En seguimiento",
      descripcion: "Caso en seguimiento controlado",
    },
    proxima_accion:
      partial.proxima_accion !== undefined
        ? partial.proxima_accion
        : "Validar diagnóstico humano",
    proxima_fecha:
      partial.proxima_fecha !== undefined
        ? partial.proxima_fecha
        : "2026-04-25",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Validar diagnóstico humano",
      urgencia: "media",
      motivo: "El caso requiere completar el tramo de validación técnica.",
      fecha_sugerida: "2026-04-25",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-24T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-24T00:00:00.000Z",
      prioridad: "media",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      requiere_validacion: true,
      requiere_validacion_manual: true,
      requiere_validacion_derivada: false,
      motivo_validacion: ["criterio_tecnico"],
      motivos_validacion: ["criterio_tecnico"],
      validacion_pendiente: true,
      validacion_resuelta: false,
      resultado_validacion: null,
      validado_por: null,
      fecha_validacion: null,
      observacion_validacion: null,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "medio",
      claridad_intencion: "media",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo técnico pendiente",
    },
  };
}

describe("resolverInputAgenteIA", () => {
  it("enruta al agente IA activo según la macroárea y expone el orquestador general", () => {
    const result = resolverInputAgenteIA(buildCaso());

    expect(result.orquestador.codigo).toBe("ia-agent-general");
    expect(result.agente_ia_activo.codigo).toBe("ia-agent-tecnico");
    expect(result.agente_ia_activo.nombre).toBe("IA agent");
  });

  it("detecta validación pendiente como input prioritario", () => {
    const result = resolverInputAgenteIA(buildCaso());

    expect(result.tipo_de_input).toBe("validacion_pendiente");
    expect(result.prioridad_operativa).toBe("alta");
    expect(result.señales_detectadas).toContain("validacion_pendiente");
    expect(result.accion_recomendada_opcional).toBe("Validar diagnóstico humano");
  });

  it("eleva continuidad vencida como incidencia crítica", () => {
    const result = resolverInputAgenteIA(
      buildCaso({
        workflow: {
          ...buildCaso().workflow,
          continuidad: {
            ...buildCaso().workflow.continuidad,
            estado: "vencida",
            motivo_espera: "La fecha comprometida ya venció.",
          },
        },
        metadata: {
          ...buildCaso().metadata,
          validacion_pendiente: false,
          requiere_validacion: false,
        },
      })
    );

    expect(result.tipo_de_input).toBe("continuidad_vencida");
    expect(result.prioridad_operativa).toBe("critica");
    expect(result.señales_detectadas).toContain("continuidad_vencida");
  });

  it("detecta entrada incompleta cuando faltan próxima acción y fecha", () => {
    const caso = buildCaso({
      macroarea_actual: "administracion",
      macroarea_label: "Administración",
      proxima_accion: null,
      proxima_fecha: null,
      workflow: {
        ...buildCaso().workflow,
        continuidad: {
          ...buildCaso().workflow.continuidad,
          estado: "pendiente",
          proxima_accion: null,
          proxima_fecha: null,
          owner_actual: "administracion",
        },
      },
      metadata: {
        ...buildCaso().metadata,
        validacion_pendiente: false,
        requiere_validacion: false,
        macroarea_motivo: "Falta completar continuidad administrativa.",
      },
      recomendacion_operativa: {
        accion: "Definir próxima acción y fecha",
        urgencia: "alta",
        motivo: "El caso carece de continuidad operativa completa.",
        fecha_sugerida: "2026-04-24",
      },
    });

    const result = resolverInputAgenteIA(caso);

    expect(result.agente_ia_activo.codigo).toBe("ia-agent-administracion");
    expect(result.tipo_de_input).toBe("entrada_incompleta");
    expect(result.señales_detectadas).toEqual(
      expect.arrayContaining(["sin_proxima_accion", "sin_proxima_fecha"])
    );
  });

  it("marca cierre pendiente cuando el caso ya está en tramo de cierre", () => {
    const caso = buildCaso({
      macroarea_actual: "administracion",
      macroarea_label: "Administración",
      workflow: {
        ...buildCaso().workflow,
        etapa_actual: "cierre_tecnico",
        continuidad: {
          ...buildCaso().workflow.continuidad,
          owner_actual: "administracion",
        },
      },
      metadata: {
        ...buildCaso().metadata,
        validacion_pendiente: false,
        requiere_validacion: false,
      },
      recomendacion_operativa: {
        accion: "Registrar cierre técnico",
        urgencia: "alta",
        motivo: "El caso está listo para cerrar formalmente.",
        fecha_sugerida: "2026-04-25",
      },
    });

    const result = resolverInputAgenteIA(caso);

    expect(result.tipo_de_input).toBe("cierre_pendiente");
    expect(result.agente_ia_activo.codigo).toBe("ia-agent-administracion");
    expect(result.accion_recomendada_opcional).toBe("Registrar cierre técnico");
  });

  it("devuelve sin_alerta cuando la continuidad está controlada", () => {
    const caso = buildCaso({
      metadata: {
        ...buildCaso().metadata,
        validacion_pendiente: false,
        requiere_validacion: false,
      },
      workflow: {
        ...buildCaso().workflow,
        etapa_actual: "gestion_comercial",
        continuidad: {
          ...buildCaso().workflow.continuidad,
          estado: "al_dia",
          proxima_accion: "Esperar respuesta del cliente",
          proxima_fecha: "2026-04-28",
          owner_actual: "comercial",
        },
      },
      macroarea_actual: "comercial",
      macroarea_label: "Comercial",
      proxima_accion: "Esperar respuesta del cliente",
      proxima_fecha: "2026-04-28",
      recomendacion_operativa: {
        accion: "Esperar respuesta del cliente",
        urgencia: "baja",
        motivo: "El caso mantiene continuidad visible y no requiere intervención inmediata.",
        fecha_sugerida: "2026-04-28",
      },
    });

    const result = resolverInputAgenteIA(caso);

    expect(result.tipo_de_input).toBe("sin_alerta");
    expect(result.agente_ia_activo.codigo).toBe("ia-agent-comercial");
    expect(result.accion_recomendada_opcional).toBeNull();
  });
});
