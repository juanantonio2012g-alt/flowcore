import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executePostventa } from "./executePostventa";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

type PostventaRow = {
  id: string;
  caso_id: string;
  fecha_postventa: string | null;
  estado_postventa: string | null;
  observacion_postventa: string | null;
  requiere_accion: boolean | null;
  proxima_accion: string | null;
  proxima_fecha: string | null;
  conformidad_final: boolean | null;
  responsable_postventa: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    workflow:
      partial.workflow ??
      ({
        caso_id: "caso-1",
        version: 1,
        etapa_actual: "auditoria",
        estado_workflow: "activo",
        etapas: [],
        hitos: [],
        logistica: null,
        auditoria: {
          estado_auditoria: "conforme",
          fecha_auditoria: "2026-04-07",
          responsable_auditoria: "QA",
          observaciones_auditoria: "Auditoría conforme",
          conformidad_cliente: true,
          requiere_correccion: false,
          fecha_cierre_tecnico: "2026-04-07",
        },
        postventa: null,
        cierre_tecnico: null,
        continuidad: {
          estado: "al_dia",
          proxima_accion: "Registrar seguimiento postventa",
          proxima_fecha: "2026-04-07",
          owner_actual: "administracion",
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
          resumen: {
            estado: "fluido",
            descripcion: "Test",
          },
        },
        metadata: {
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-07T00:00:00.000Z",
          ultima_transicion_at: "2026-04-07T00:00:00.000Z",
          ultima_transicion_por: "qa@test.com",
          derivado_desde: ["casos", "auditorias"],
        },
      } as CasoNormalizado["workflow"]),
    macroarea_actual: partial.macroarea_actual ?? "administracion",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Administración",
    macroarea_orden: partial.macroarea_orden ?? 4,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "SLA próximo a vencer",
      descripcion: "Caso en transición a postventa",
    },
    proxima_accion: partial.proxima_accion ?? "Registrar seguimiento postventa",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-07",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Registrar seguimiento postventa",
      urgencia: "media",
      motivo: "Abrir postventa",
      fecha_sugerida: "2026-04-07",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-07T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "aprobado",
      requiere_validacion: false,
      requiere_validacion_manual: false,
      requiere_validacion_derivada: false,
      motivo_validacion: [],
      motivos_validacion: [],
      validacion_pendiente: false,
      validacion_resuelta: false,
      resultado_validacion: null,
      validado_por: null,
      fecha_validacion: null,
      observacion_validacion: null,
      nivel_confianza_cliente: "alta",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "alta",
      probabilidad_conversion: "alta",
      observacion_relacional: null,
      macroarea_motivo: "Caso listo para postventa",
    },
  };
}

function createSupabaseMock(args?: {
  workflowTransitionsData?: Array<{ id: string; transition_code: string }>;
  existingWorkflowTransitions?: Array<{ transition_code: string }>;
  existingPostventa?: Partial<PostventaRow> | null;
}) {
  const postventaInsertResult = { data: { id: "post-1" }, error: null };
  const postventaUpdateResult = { data: { id: "post-1" }, error: null };
  const postventaExistingResult = {
    data:
      args && "existingPostventa" in args
        ? args.existingPostventa
          ? {
              id: args.existingPostventa.id ?? "post-1",
              caso_id: args.existingPostventa.caso_id ?? "caso-1",
              fecha_postventa: args.existingPostventa.fecha_postventa ?? "2026-04-08",
              estado_postventa:
                args.existingPostventa.estado_postventa ?? "en_seguimiento",
              observacion_postventa:
                args.existingPostventa.observacion_postventa ?? "Seguimiento activo",
              requiere_accion:
                args.existingPostventa.requiere_accion ?? false,
              proxima_accion:
                args.existingPostventa.proxima_accion ?? "Dar seguimiento postventa",
              proxima_fecha:
                args.existingPostventa.proxima_fecha ?? "2026-04-09",
              conformidad_final:
                args.existingPostventa.conformidad_final ?? false,
              responsable_postventa:
                args.existingPostventa.responsable_postventa ?? "Postventa",
              notas: args.existingPostventa.notas ?? null,
              created_at:
                args.existingPostventa.created_at ?? "2026-04-08T00:00:00.000Z",
              updated_at:
                args.existingPostventa.updated_at ?? "2026-04-08T00:00:00.000Z",
            }
          : null
        : null,
    error: null,
  };
  const casoUpdateResult = { data: { id: "caso-1" }, error: null };
  const bitacoraInsertResult = { error: null };
  const workflowTransitionsInsertResult = {
    data:
      args?.workflowTransitionsData ??
      [{ id: "wf-1", transition_code: "postventa_abierta" }],
    error: null,
  };
  const workflowTransitionsExistingResult = {
    data:
      args?.existingWorkflowTransitions ??
      ([] as Array<{ transition_code: string }>),
    error: null,
  };

  const postventasTable = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => postventaInsertResult),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => postventaUpdateResult),
          })),
        })),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => postventaExistingResult),
        })),
      })),
    })),
  };

  const casosTable = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => casoUpdateResult),
        })),
      })),
    })),
  };

  const bitacoraTable = {
    insert: vi.fn(async () => bitacoraInsertResult),
  };

  const workflowTransitionsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(async () => workflowTransitionsExistingResult),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(async () => workflowTransitionsInsertResult),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "postventas") return postventasTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      if (table === "workflow_transitions") return workflowTransitionsTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    postventasTable,
    casosTable,
    workflowTransitionsTable,
  };
}

describe("executePostventa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("abre postventa formal y sincroniza continuidad del caso", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsData: [{ id: "wf-1", transition_code: "postventa_abierta" }],
    });

    const result = await executePostventa(
      {
        caso_id: "caso-1",
        accion: "registrar_postventa",
        payload: {
          fecha_postventa: "2026-04-08",
          estado_postventa: "en_seguimiento",
          observacion_postventa: "Seguimiento inicial",
          requiere_accion: false,
          proxima_accion: "Dar seguimiento postventa",
          proxima_fecha: "2026-04-09",
          responsable_postventa: "Postventa",
        },
        actor: "postventa@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "postventa_abierta",
        from_stage: "auditoria",
        to_stage: "postventa",
        evidencia_ref: "post-1",
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: "Dar seguimiento postventa",
        proxima_fecha: "2026-04-09",
      })
    );
  });

  it("habilita cierre técnico cuando la postventa queda resuelta", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsData: [
        { id: "wf-1", transition_code: "postventa_abierta" },
        { id: "wf-2", transition_code: "cierre_tecnico_habilitado" },
      ],
    });

    const result = await executePostventa(
      {
        caso_id: "caso-1",
        accion: "registrar_postventa",
        payload: {
          fecha_postventa: "2026-04-08",
          estado_postventa: "resuelta",
          observacion_postventa: "Cliente conforme",
          requiere_accion: false,
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: "2026-04-09",
          conformidad_final: true,
          responsable_postventa: "Postventa",
        },
        actor: "postventa@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "postventa_abierta",
      }),
      expect.objectContaining({
        transition_code: "cierre_tecnico_habilitado",
        from_stage: "postventa",
        to_stage: "cierre_tecnico",
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: "Cerrar técnicamente el caso",
        proxima_fecha: "2026-04-09",
      })
    );
  });
});
