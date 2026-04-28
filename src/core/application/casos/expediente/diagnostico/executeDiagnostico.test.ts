import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeDiagnostico } from "./executeDiagnostico";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
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

function createSupabaseMock(args: {
  updatedDiagnostico?: { id: string } | null;
  insertedDiagnostico?: { id: string } | null;
  caseState?: {
    responsable_actual: string | null;
    diagnostico_por: string | null;
    proxima_accion: string | null;
    proxima_fecha: string | null;
  } | null;
  updatedCaso?: { id: string } | null;
} = {}) {
  const {
    updatedDiagnostico = null,
    insertedDiagnostico = { id: "diag-1" },
    caseState = {
      responsable_actual: "Técnico",
      diagnostico_por: "tecnico@test.com",
      proxima_accion: "Preparar cotización",
      proxima_fecha: "2026-04-09",
    },
    updatedCaso = { id: "caso-1" },
  } = args;

  const diagnosticosTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: "diag-1",
              caso_id: "caso-1",
              problematica_identificada: "Fisuras visibles",
              causa_probable: "Movimiento estructural",
              nivel_certeza: "medio",
              categoria_caso: "grietas_fisuras",
              solucion_recomendada: "Sellado",
              producto_recomendado: null,
              proceso_sugerido: null,
              observaciones_tecnicas: null,
              requiere_validacion: true,
              fecha_validacion: null,
              created_at: "2026-04-01T00:00:00.000Z",
            },
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: insertedDiagnostico,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: updatedDiagnostico,
              error: null,
            })),
          })),
        })),
      })),
    })),
  };

  const casosTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({
          data: caseState,
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: updatedCaso,
            error: null,
          })),
        })),
      })),
    })),
  };

  const bitacoraTable = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "diagnosticos") return diagnosticosTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    diagnosticosTable,
    casosTable,
    bitacoraTable,
  };
}

describe("executeDiagnostico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("frena el write cuando el update del diagnostico no afecta filas", async () => {
    const supabase = createSupabaseMock({ updatedDiagnostico: null });

    const result = await executeDiagnostico(
      {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        accion: "actualizar_diagnostico",
        payload: {
          problematica_identificada: "Fisuras activas",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(
      result.errores.some(
        (error) => error.codigo === "diagnostico_no_actualizado"
      )
    ).toBe(true);
    expect(supabase.diagnosticosTable.update).toHaveBeenCalled();
  });

  it("sincroniza continuidad de validacion cuando el diagnostico la requiere", async () => {
    const supabase = createSupabaseMock({
      caseState: {
        responsable_actual: null,
        diagnostico_por: null,
        proxima_accion: "Preparar cotización",
        proxima_fecha: null,
      },
    });

    const result = await executeDiagnostico(
      {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {
          problematica_identificada: "Fisuras activas",
          causa_probable: "Movimiento estructural",
          nivel_certeza: "medio",
          categoria_caso: "grietas_fisuras",
          solucion_recomendada: "Sellado",
          requiere_validacion: true,
          fecha_validacion: "2026-04-09",
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        responsable_actual: "Técnico",
        diagnostico_por: "tecnico@test.com",
        proxima_accion: "Validar diagnóstico humano",
        proxima_fecha: "2026-04-09",
      })
    );
    expect(result.cambios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: "proxima_accion",
          anterior: "Preparar cotización",
          nuevo: "Validar diagnóstico humano",
        }),
        expect.objectContaining({
          campo: "proxima_fecha",
          anterior: null,
          nuevo: "2026-04-09",
        }),
      ])
    );
  });

  it("no sobreescribe continuidad del caso cuando el diagnostico no requiere validacion", async () => {
    const supabase = createSupabaseMock({
      caseState: {
        responsable_actual: null,
        diagnostico_por: null,
        proxima_accion: "Preparar cotización",
        proxima_fecha: "2026-04-09",
      },
    });

    const result = await executeDiagnostico(
      {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {
          problematica_identificada: "Fisuras activas",
          causa_probable: "Movimiento estructural",
          nivel_certeza: "alto",
          categoria_caso: "grietas_fisuras",
          solucion_recomendada: "Sellado",
          requiere_validacion: false,
        },
        actor: "tecnico@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casosTable.update).toHaveBeenCalled();
    const casePayload = supabase.casosTable.update.mock.calls[0]?.[0];
    expect(casePayload).toEqual(
      expect.objectContaining({
        responsable_actual: "Técnico",
        diagnostico_por: "tecnico@test.com",
      })
    );
    expect(casePayload).not.toHaveProperty("proxima_accion");
    expect(casePayload).not.toHaveProperty("proxima_fecha");
    expect(
      result.cambios.some((cambio) => cambio.campo === "proxima_accion")
    ).toBe(false);
    expect(
      result.cambios.some((cambio) => cambio.campo === "proxima_fecha")
    ).toBe(false);
  });
});
