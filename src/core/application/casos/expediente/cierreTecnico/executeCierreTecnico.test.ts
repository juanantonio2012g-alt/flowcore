import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeCierreTecnico } from "./executeCierreTecnico";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

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
        etapa_actual: "postventa",
        estado_workflow: "activo",
        etapas: [],
        hitos: [],
        logistica: null,
        auditoria: {
          estado_auditoria: "conforme",
          fecha_auditoria: "2026-04-07",
          responsable_auditoria: "QA",
          observaciones_auditoria: "Conforme",
          conformidad_cliente: true,
          requiere_correccion: false,
          fecha_cierre_tecnico: "2026-04-07",
        },
        postventa: {
          estado_postventa: "resuelta",
          fecha_postventa: "2026-04-08",
          responsable_postventa: "Postventa",
          observacion_postventa: "Resuelta",
          requiere_accion: false,
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: "2026-04-09",
          conformidad_final: true,
          notas: null,
        },
        cierre_tecnico: null,
        continuidad: {
          estado: "al_dia",
          proxima_accion: "Cerrar técnicamente el caso",
          proxima_fecha: "2026-04-09",
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
        cierre: {
          resultado_final: "postventa_activa",
          fecha_cierre: "2026-04-08",
          motivo_cierre: "Postventa activa",
        },
        metadata: {
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-08T00:00:00.000Z",
          ultima_transicion_at: "2026-04-08T00:00:00.000Z",
          ultima_transicion_por: "postventa@test.com",
          derivado_desde: ["casos", "auditorias", "postventas"],
        },
      } as CasoNormalizado["workflow"]),
    macroarea_actual: partial.macroarea_actual ?? "administracion",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Administración",
    macroarea_orden: partial.macroarea_orden ?? 4,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "SLA en tiempo",
      descripcion: "Caso listo para cierre técnico",
    },
    proxima_accion: partial.proxima_accion ?? "Cerrar técnicamente el caso",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-09",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Cerrar técnicamente el caso",
      urgencia: "media",
      motivo: "La postventa ya quedó resuelta.",
      fecha_sugerida: "2026-04-09",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-09T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "media",
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
      macroarea_motivo: "Caso listo para cierre técnico",
    },
  };
}

function createSupabaseMock(args?: {
  existingCierreTecnico?: Record<string, unknown> | null;
  cierreTecnicoSelectError?: { code?: string; message: string } | null;
  existingWorkflowTransitions?: Array<{ transition_code: string }>;
  workflowTransitionsData?: Array<{ id: string; transition_code: string }>;
}) {
  const cierreInsertResult = { data: { id: "cierre-1" }, error: null };
  const cierreExistingResult = {
    data: args?.existingCierreTecnico ?? null,
    error: args?.cierreTecnicoSelectError ?? null,
  };
  const casoUpdateResult = { data: { id: "caso-1" }, error: null };
  const bitacoraInsertResult = { error: null };
  const workflowTransitionsExistingResult = {
    data:
      args?.existingWorkflowTransitions ??
      ([] as Array<{ transition_code: string }>),
    error: null,
  };
  const workflowTransitionsInsertResult = {
    data:
      args?.workflowTransitionsData ??
      [{ id: "wf-1", transition_code: "cierre_tecnico_registrado" }],
    error: null,
  };

  const cierresTecnicosTable = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => cierreInsertResult),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(async () => cierreExistingResult),
          })),
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
      if (table === "cierres_tecnicos") return cierresTecnicosTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      if (table === "workflow_transitions") return workflowTransitionsTable;
      throw new Error(`Tabla no mockeada: ${table}`);
    }),
    cierresTecnicosTable,
    casosTable,
    workflowTransitionsTable,
  };
}

describe("executeCierreTecnico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra cierre técnico y saca el caso de la continuidad activa", async () => {
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
    const supabase = createSupabaseMock();

    const result = await executeCierreTecnico(
      {
        caso_id: "caso-1",
        accion: "registrar_cierre_tecnico",
        payload: {
          fecha_cierre_tecnico: "2026-04-09",
          responsable_cierre: "Operaciones",
          motivo_cierre: "Ciclo operativo completado",
          observacion_cierre: "Sin pendientes adicionales",
          postventa_resuelta: true,
          requiere_postventa_adicional: false,
        },
        actor: "ops@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(result.cierre_tecnico_id).toBe("cierre-1");
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cierre_tecnico_registrado",
        from_stage: "postventa",
        to_stage: "cierre_tecnico",
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: null,
        proxima_fecha: null,
        responsable_actual: "Operaciones",
      })
    );
  });

  it("bloquea el cierre si la postventa todavía requiere acción adicional", async () => {
    getCasoNormalizadoById.mockResolvedValue(
      buildCaso({
        workflow: {
          ...buildCaso().workflow,
          postventa: {
            ...buildCaso().workflow.postventa!,
            requiere_accion: true,
          },
        },
      })
    );
    const supabase = createSupabaseMock();

    const result = await executeCierreTecnico(
      {
        caso_id: "caso-1",
        accion: "registrar_cierre_tecnico",
        payload: {
          fecha_cierre_tecnico: "2026-04-09",
          responsable_cierre: "Operaciones",
          postventa_resuelta: true,
          requiere_postventa_adicional: false,
        },
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.codigo).toBe(
      "cierre_tecnico_requiere_postventa_resuelta"
    );
    expect(supabase.cierresTecnicosTable.insert).not.toHaveBeenCalled();
  });

  it("cierra con transición formal si la tabla de cierres técnicos no está disponible vía API", async () => {
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
    const supabase = createSupabaseMock({
      cierreTecnicoSelectError: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.cierres_tecnicos' in the schema cache",
      },
    });

    const result = await executeCierreTecnico(
      {
        caso_id: "caso-1",
        accion: "registrar_cierre_tecnico",
        payload: {
          fecha_cierre_tecnico: "2026-04-09",
          responsable_cierre: "Operaciones",
          motivo_cierre: "Ciclo operativo completado",
          observacion_cierre: "Sin pendientes adicionales",
          postventa_resuelta: true,
          requiere_postventa_adicional: false,
        },
        actor: "ops@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(result.cierre_tecnico_id).toBeNull();
    expect(result.advertencias[0]?.codigo).toBe(
      "cierre_tecnico_tabla_no_disponible"
    );
    expect(supabase.cierresTecnicosTable.insert).not.toHaveBeenCalled();
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cierre_tecnico_registrado",
        evidencia_ref: null,
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: null,
        proxima_fecha: null,
      })
    );
  });
});
