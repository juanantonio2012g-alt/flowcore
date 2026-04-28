import { describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { buildEventoAgenteIA } from "./buildEventoAgenteIA";
import { resolverInputAgenteIA } from "./resolverInputAgenteIA";

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
  return {
    id: partial.id ?? "caso-ia-1",
    estado: partial.estado ?? "cotizacion",
    estado_label: partial.estado_label ?? "Cotización",
    workflow: partial.workflow ?? {
      caso_id: "caso-ia-1",
      version: 1,
      etapa_actual: "gestion_comercial",
      estado_workflow: "activo",
      etapas: [],
      hitos: [],
      logistica: null,
      auditoria: null,
      postventa: null,
      cierre_tecnico: null,
      continuidad: {
        estado: "pendiente",
        proxima_accion: "Dar seguimiento comercial",
        proxima_fecha: "2026-04-26",
        owner_actual: "comercial",
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
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En seguimiento",
      descripcion: "Caso operativo controlado",
    },
    proxima_accion:
      partial.proxima_accion !== undefined
        ? partial.proxima_accion
        : "Dar seguimiento comercial",
    proxima_fecha:
      partial.proxima_fecha !== undefined ? partial.proxima_fecha : "2026-04-26",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Dar seguimiento comercial",
      urgencia: "media",
      motivo: "Conviene sostener la continuidad comercial del caso.",
      fecha_sugerida: "2026-04-26",
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
      estado_comercial_real: "en_proceso",
      requiere_validacion: false,
      requiere_validacion_manual: false,
      requiere_validacion_derivada: false,
      motivo_validacion: [],
      motivos_validacion: [],
      validacion_pendiente: false,
      validacion_resuelta: true,
      resultado_validacion: "validado",
      validado_por: null,
      fecha_validacion: null,
      observacion_validacion: null,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "medio",
      claridad_intencion: "media",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Seguimiento comercial activo",
    },
  };
}

describe("buildEventoAgenteIA", () => {
  it("construye un evento registrable a partir del caso y el input resuelto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const caso = buildCaso();
    const inputResuelto = resolverInputAgenteIA(caso);

    const evento = buildEventoAgenteIA(caso, inputResuelto);

    expect(evento).toEqual({
      caso_id: "caso-ia-1",
      agente_ia_id: "ia-00000000-0000-4000-8000-000000000004",
      agente_ia_codigo: "ia-agent-comercial",
      tipo_de_input: "seguimiento_requerido",
      prioridad_operativa: "alta",
      señales_detectadas: expect.arrayContaining([]),
      sugerencia_operativa: inputResuelto.sugerencia_operativa,
      accion_recomendada_opcional: "Dar seguimiento comercial",
      created_at: "2026-04-24T12:00:00.000Z",
      source: "ia_agent",
    });

    vi.useRealTimers();
  });

  it("deduplica señales detectadas y preserva source fijo del agente", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00.000Z"));

    const caso = buildCaso({
      workflow: {
        ...buildCaso().workflow,
        continuidad: {
          ...buildCaso().workflow.continuidad,
          estado: "vencida",
          motivo_espera: "La continuidad está vencida.",
        },
      },
    });
    const inputResuelto = {
      ...resolverInputAgenteIA(caso),
      señales_detectadas: [
        "continuidad_vencida",
        "continuidad_vencida",
        "workflow_con_alertas",
      ],
    };

    const evento = buildEventoAgenteIA(caso, inputResuelto);

    expect(evento.source).toBe("ia_agent");
    expect(evento.señales_detectadas).toEqual([
      "continuidad_vencida",
      "workflow_con_alertas",
    ]);

    vi.useRealTimers();
  });
});
