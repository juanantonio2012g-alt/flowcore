import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeCotizacion } from "./executeCotizacion";

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
    estado: partial.estado ?? "cotizacion",
    estado_label: partial.estado_label ?? "Cotización",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "administracion",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "Cotización pendiente",
      descripcion: "Hace falta emitir propuesta comercial",
    },
    proxima_accion: partial.proxima_accion ?? "Preparar cotización",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-07",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Preparar cotización",
      urgencia: "alta",
      motivo: "El caso ya tiene base técnica suficiente",
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
      estado_tecnico_real: "solucion_definida",
      estado_comercial_real: "sin_cotizar",
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
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo comercial pendiente",
    },
  };
}

function createSupabaseMock(args?: {
  workflowTransitionsError?: Record<string, unknown> | null;
  existingWorkflowTransition?: Record<string, unknown> | null;
}) {
  const cotizacionInsertResult = { data: { id: "cot-1" }, error: null };
  const cotizacionSelectResult = {
    data: {
      id: "cot-1",
      caso_id: "caso-1",
      fecha_cotizacion: "2026-04-06",
      solucion_asociada: "Cambio de componente",
      productos_incluidos: null,
      cantidades: null,
      condiciones: null,
      observaciones: null,
      monto: 1200,
      estado: "pendiente",
      created_at: "2026-04-06T00:00:00.000Z",
    },
    error: null,
  };
  const cotizacionUpdateResult = { data: { id: "cot-1" }, error: null };
  const casoUpdateResult = { data: { id: "caso-1" }, error: null };
  const bitacoraInsertResult = { error: null };
  const workflowTransitionsInsertResult = {
    data: [{ id: "wf-1", transition_code: "cotizacion_emitida" }],
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

  const cotizacionesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => cotizacionSelectResult),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => cotizacionInsertResult),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => cotizacionUpdateResult),
          })),
        })),
      })),
    })),
  };

  const casosTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: {
            responsable_actual: "Técnico",
            cotizacion_por: null,
            proxima_accion: null,
            proxima_fecha: null,
          },
          error: null,
        })),
      })),
    })),
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
      if (table === "cotizaciones") return cotizacionesTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      if (table === "workflow_transitions") return workflowTransitionsTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    cotizacionesTable,
    casosTable,
    workflowTransitionsTable,
  };
}

describe("executeCotizacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("persiste la transición formal cuando se emite una cotización", async () => {
    const supabase = createSupabaseMock();

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {
          fecha_cotizacion: "2026-04-06",
          solucion_asociada: "Cambio de componente",
          monto: 1200,
          estado: "enviada",
          observaciones: "Cotización emitida al cliente",
          proxima_accion: "Esperar respuesta del cliente",
          proxima_fecha: "2026-04-10",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        caso_id: "caso-1",
        transition_code: "cotizacion_emitida",
        from_stage: "cotizacion",
        to_stage: "cotizacion",
        evidencia_ref: "cot-1",
      }),
    ]);
  });

  it("falla explícitamente si la cotización se guarda pero no su transición formal", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsError: {
        message: "relation workflow_transitions does not exist",
      },
    });

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {
          fecha_cotizacion: "2026-04-06",
          solucion_asociada: "Cambio de componente",
          monto: 1200,
          estado: "enviada",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.codigo).toBe("workflow_transition_no_registrada");
    expect(result.errores[0]?.mensaje).toContain("cotización se guardó");
  });

  it("backfillea la transición faltante cuando la cotización ya existía y se actualiza", async () => {
    const supabase = createSupabaseMock();

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "actualizar_cotizacion",
        cotizacion_id: "cot-1",
        payload: {
          estado: "pendiente",
          observaciones: "Se mantiene la cotización vigente",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(
      result.advertencias.some(
        (warning) => warning.codigo === "workflow_transition_backfilled"
      )
    ).toBe(true);
    expect(supabase.cotizacionesTable.update).toHaveBeenCalledWith({
      estado: "pendiente",
      observaciones: "Se mantiene la cotización vigente",
    });
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cotizacion_emitida",
        evidencia_ref: "cot-1",
      }),
    ]);
  });

  it("mantiene idempotencia cuando la transición de cotización ya existe", async () => {
    const supabase = createSupabaseMock({
      existingWorkflowTransition: {
        id: "wf-1",
      },
    });

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "actualizar_cotizacion",
        cotizacion_id: "cot-1",
        payload: {
          estado: "pendiente",
        },
        actor: "comercial@test.com",
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
  });

  it("preserva campos existentes cuando el update llega parcial solo con estado", async () => {
    const supabase = createSupabaseMock();

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "actualizar_cotizacion",
        cotizacion_id: "cot-1",
        payload: {
          estado: "pendiente",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.cotizacionesTable.update).toHaveBeenCalledWith({
      estado: "pendiente",
    });
    expect(
      result.cambios.some((cambio) => cambio.campo.startsWith("cotizacion."))
    ).toBe(false);
  });

  it("permite update completo cuando llegan múltiples campos explícitos", async () => {
    const supabase = createSupabaseMock();

    const result = await executeCotizacion(
      {
        caso_id: "caso-1",
        accion: "actualizar_cotizacion",
        cotizacion_id: "cot-1",
        payload: {
          fecha_cotizacion: "2026-04-08",
          solucion_asociada: "Nueva solución",
          observaciones: "Nueva observación",
          monto: 1800,
          estado: "enviada",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.cotizacionesTable.update).toHaveBeenCalledWith({
      fecha_cotizacion: "2026-04-08",
      solucion_asociada: "Nueva solución",
      observaciones: "Nueva observación",
      monto: 1800,
      estado: "enviada",
    });
    expect(
      result.cambios.some((cambio) => cambio.campo === "cotizacion.fecha_cotizacion")
    ).toBe(true);
  });
});
