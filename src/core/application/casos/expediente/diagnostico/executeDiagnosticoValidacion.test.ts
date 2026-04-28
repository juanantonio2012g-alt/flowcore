import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeDiagnosticoValidacion } from "./executeDiagnosticoValidacion";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "validacion",
    estado_label: partial.estado_label ?? "Validación",
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "Validación requerida",
      descripcion: "Caso en revisión técnica",
    },
    proxima_accion: partial.proxima_accion ?? "Validar diagnóstico humano",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Validar diagnóstico humano",
      urgencia: "alta",
      motivo: "Hace falta cerrar el criterio técnico",
      fecha_sugerida: "2026-04-05",
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
      estado_comercial_real: "sin_cotizar",
      requiere_validacion: true,
      requiere_validacion_manual: true,
      requiere_validacion_derivada: false,
      motivo_validacion: ["Nivel de certeza medio o menor."],
      motivos_validacion: ["Nivel de certeza medio o menor."],
      validacion_pendiente: true,
      validacion_resuelta: false,
      resultado_validacion: null,
      validado_por: null,
      fecha_validacion: null,
      observacion_validacion: null,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo técnico pendiente",
    },
  };
}

function createSupabaseMock(args?: {
  existingDiagnostico?: Record<string, unknown> | null;
  updatedDiagnostico?: Record<string, unknown> | null;
  updateError?: Record<string, unknown> | null;
  existingCase?: Record<string, unknown> | null;
  updatedCase?: Record<string, unknown> | null;
  caseUpdateError?: Record<string, unknown> | null;
  workflowTransitionsError?: Record<string, unknown> | null;
  existingWorkflowTransition?: Record<string, unknown> | null;
}) {
  const diagnosticoSelectResult = {
    data:
      args && "existingDiagnostico" in args
        ? args.existingDiagnostico
        : {
        id: "diag-1",
        caso_id: "caso-1",
        validado_por: null,
        fecha_validacion: null,
        resultado_validacion: null,
        observacion_validacion: null,
      },
    error: null,
  };
  const diagnosticoUpdateResult = {
    data:
      args && "updatedDiagnostico" in args
        ? args.updatedDiagnostico
        : { id: "diag-1" },
    error:
      args && "updateError" in args
        ? args.updateError
        : null,
  };
  const caseSelectResult = {
    data:
      args && "existingCase" in args
        ? args.existingCase
        : {
            proxima_accion: "Validar diagnóstico humano",
            proxima_fecha: "2026-04-06",
          },
    error: null,
  };
  const caseUpdateResult = {
    data:
      args && "updatedCase" in args
        ? args.updatedCase
        : { id: "caso-1" },
    error:
      args && "caseUpdateError" in args
        ? args.caseUpdateError
        : null,
  };
  const bitacoraInsertResult = { error: null };
  const workflowTransitionsInsertResult = {
    data: [{ id: "wf-1", transition_code: "diagnostico_validado" }],
    error:
      args && "workflowTransitionsError" in args
        ? args.workflowTransitionsError
        : null,
  };
  const workflowTransitionLookupResult = {
    data:
      args && "existingWorkflowTransition" in args
        ? args.existingWorkflowTransition
        : null,
    error: null,
  };

  const diagnosticosTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => diagnosticoSelectResult),
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => diagnosticoUpdateResult),
          })),
        })),
      })),
    })),
  };

  const bitacoraTable = {
    insert: vi.fn(async () => bitacoraInsertResult),
  };
  const casosTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => caseSelectResult),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => caseUpdateResult),
        })),
      })),
    })),
  };
  const workflowTransitionsTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => workflowTransitionLookupResult),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(async () => workflowTransitionsInsertResult),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "diagnosticos") {
        return diagnosticosTable;
      }
      if (table === "bitacora_cambios_caso") {
        return bitacoraTable;
      }
      if (table === "casos") {
        return casosTable;
      }
      if (table === "workflow_transitions") {
        return workflowTransitionsTable;
      }
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    diagnosticosTable,
    casosTable,
    bitacoraTable,
    workflowTransitionsTable,
  };
}

describe("executeDiagnosticoValidacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("persiste la validacion formal en la fila correcta del diagnostico", async () => {
    const supabase = createSupabaseMock();

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
          fecha_validacion: "2026-04-06",
          validado_por: "2d6d44e7-0872-4cd2-9324-dcd4d5f7fdce",
          observacion_validacion: "Criterio confirmado",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.diagnosticosTable.update).toHaveBeenCalledWith({
      validado_por: "2d6d44e7-0872-4cd2-9324-dcd4d5f7fdce",
      fecha_validacion: "2026-04-06",
      resultado_validacion: "validado",
      observacion_validacion: "Criterio confirmado",
    });
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        caso_id: "caso-1",
        transition_code: "diagnostico_validado",
        from_stage: "diagnostico",
        to_stage: "diagnostico",
        evidencia_ref: "diag-1",
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith({
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2026-04-06",
    });
  });

  it("backfillea la transición de workflow si el diagnóstico ya estaba validado y no hubo cambios en la fila", async () => {
    const supabase = createSupabaseMock({
      existingDiagnostico: {
        id: "diag-1",
        caso_id: "caso-1",
        validado_por: null,
        fecha_validacion: "2026-04-06",
        resultado_validacion: "validado",
        observacion_validacion: "Criterio confirmado",
      },
      existingCase: {
        proxima_accion: "Preparar cotización",
        proxima_fecha: "2026-04-06",
      },
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
          fecha_validacion: "2026-04-06",
          observacion_validacion: "Criterio confirmado",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(
      result.advertencias.some(
        (warning) => warning.codigo === "workflow_transition_backfilled"
      )
    ).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "diagnostico_validado",
        evidencia_ref: "diag-1",
      }),
    ]);
  });

  it("mantiene idempotencia estricta cuando la transición ya existe", async () => {
    const supabase = createSupabaseMock({
      existingDiagnostico: {
        id: "diag-1",
        caso_id: "caso-1",
        validado_por: null,
        fecha_validacion: "2026-04-06",
        resultado_validacion: "validado",
        observacion_validacion: null,
      },
      existingWorkflowTransition: {
        id: "wf-1",
      },
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
          fecha_validacion: "2026-04-06",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).not.toHaveBeenCalled();
    expect(
      result.advertencias.some(
        (warning) => warning.codigo === "workflow_transition_backfilled"
      )
    ).toBe(false);
    expect(supabase.casosTable.update).toHaveBeenCalledWith({
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2026-04-06",
    });
  });

  it("en dev sin usuario real no intenta persistir un actor textual como validado_por", async () => {
    const supabase = createSupabaseMock();

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
        },
        actor: "dev_bypass",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.diagnosticosTable.update).toHaveBeenCalledWith({
      validado_por: null,
      fecha_validacion: expect.any(String),
      resultado_validacion: "validado",
      observacion_validacion: null,
    });
  });

  it("marca error explícito si la validación se guarda pero falla la transición de workflow", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsError: {
        message: "relation workflow_transitions does not exist",
      },
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.codigo).toBe("workflow_transition_no_registrada");
    expect(result.errores[0]?.mensaje).toContain("validación del diagnóstico se guardó");
  });

  it("no empuja continuidad a cotizacion si el resultado no es validado", async () => {
    const supabase = createSupabaseMock();

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "observado",
          fecha_validacion: "2026-04-06",
          observacion_validacion: "Hace falta ajustar el criterio técnico.",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casosTable.update).toHaveBeenCalledTimes(1);
    expect(supabase.casosTable.update).toHaveBeenCalledWith({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "tecnico@test.com",
      responsable_humano_asignado_at: expect.any(String),
    });
    expect(
      result.cambios.some((cambio) => cambio.campo === "proxima_accion")
    ).toBe(false);
  });

  it("reordena continuidad vieja aunque la validacion ya no cambie la fila del diagnostico", async () => {
    const supabase = createSupabaseMock({
      existingDiagnostico: {
        id: "diag-1",
        caso_id: "caso-1",
        validado_por: null,
        fecha_validacion: "2026-04-06",
        resultado_validacion: "validado",
        observacion_validacion: "Criterio confirmado",
      },
      existingCase: {
        proxima_accion: "Validar diagnóstico humano",
        proxima_fecha: "2026-04-06",
      },
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
          fecha_validacion: "2026-04-06",
          observacion_validacion: "Criterio confirmado",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.diagnosticosTable.update).not.toHaveBeenCalled();
    expect(supabase.casosTable.update).toHaveBeenCalledWith({
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2026-04-06",
    });
    expect(
      result.cambios.some(
        (cambio) =>
          cambio.campo === "proxima_accion" &&
          cambio.anterior === "Validar diagnóstico humano" &&
          cambio.nuevo === "Preparar cotización"
      )
    ).toBe(true);
  });

  it("marca error cuando el update no afecta ninguna fila", async () => {
    const supabase = createSupabaseMock({
      updatedDiagnostico: null,
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(
      result.errores.some(
        (error) => error.codigo === "diagnostico_validacion_no_actualizada"
      )
    ).toBe(true);
    expect(result.errores[0]?.mensaje).toContain("policy RLS de UPDATE");
  });

  it("preserva el error real de Supabase cuando el update falla", async () => {
    const supabase = createSupabaseMock({
      updateError: {
        message: "invalid input syntax for type uuid: \"dev_bypass\"",
        details: "Error updating row",
        code: "22P02",
      },
    });

    const result = await executeDiagnosticoValidacion(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
        },
        actor: "dev_bypass",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.codigo).toBe("diagnostico_validacion_no_actualizada");
    expect(result.errores[0]?.mensaje).toContain("invalid input syntax");
    expect(result.errores[0]?.mensaje).toContain("22P02");
  });
});
