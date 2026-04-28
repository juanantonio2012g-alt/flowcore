import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeQuickUpdate } from "./executeQuickUpdate";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

const { sincronizarResponsableHumanoAutomatico } = vi.hoisted(() => ({
  sincronizarResponsableHumanoAutomatico: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

vi.mock("./sincronizarResponsableHumanoAutomatico", () => ({
  sincronizarResponsableHumanoAutomatico,
}));

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En seguimiento",
      descripcion: "Caso operativo",
    },
    proxima_accion: partial.proxima_accion ?? "Llamar al cliente",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-07",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Confirmar visita",
      urgencia: "media",
      motivo: "Hace falta continuidad comercial",
      fecha_sugerida: "2026-04-08",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-06T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
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
      validado_por: "tecnico@test.com",
      fecha_validacion: "2026-04-05",
      observacion_validacion: null,
      nivel_confianza_cliente: "alta",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "alta",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Seguimiento comercial activo",
    },
  };
}

function createSupabaseMock(
  updatedCase: { id: string } | null = { id: "caso-1" }
) {
  const casesTable = {
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        error: null,
        select: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: updatedCase,
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
      if (table === "casos") return casesTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    casesTable,
    bitacoraTable,
  };
}

describe("executeQuickUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
    sincronizarResponsableHumanoAutomatico.mockResolvedValue({
      ok: true,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [],
    });
  });

  it("persiste la actualizacion operativa con el cliente recibido", async () => {
    const supabase = createSupabaseMock();

    const result = await executeQuickUpdate(
      {
        caso_id: "caso-1",
        accion: "actualizacion_manual",
        payload: {
          proxima_accion: "Coordinar visita",
          proxima_fecha: "2026-04-10",
          estado_comercial: "negociacion",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casesTable.update).toHaveBeenCalledWith({
      proxima_accion: "Coordinar visita",
      proxima_fecha: "2026-04-10",
      estado_comercial: "negociacion",
    });
  });

  it("devuelve error claro cuando el update no afecta filas", async () => {
    const supabase = createSupabaseMock(null);

    const result = await executeQuickUpdate(
      {
        caso_id: "caso-1",
        accion: "actualizacion_manual",
        payload: {
          proxima_accion: "Coordinar visita",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(
      result.errores.some((error) => error.codigo === "quick_update_error")
    ).toBe(true);
  });

  it("reanexa el responsable humano automático si la macroárea oficial cambia", async () => {
    sincronizarResponsableHumanoAutomatico.mockResolvedValue({
      ok: true,
      cambios_aplicados: true,
      cambios: [
        {
          campo: "responsable_humano_id",
          anterior: "33333333-3333-4333-8333-333333333333",
          nuevo: "55555555-5555-4555-8555-555555555555",
        },
        {
          campo: "responsable_humano_nombre",
          anterior: "José Ramírez",
          nuevo: "María Gómez",
        },
      ],
      advertencias: [],
    });
    const supabase = createSupabaseMock({ id: "caso-1" });

    const result = await executeQuickUpdate(
      {
        caso_id: "caso-1",
        accion: "actualizacion_manual",
        payload: {
          proxima_accion: "Preparar cotización",
          proxima_fecha: "2026-04-10",
          estado_comercial: "en_proceso",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(sincronizarResponsableHumanoAutomatico).toHaveBeenCalledWith({
      caso_id: "caso-1",
      actor: "comercial@test.com",
      supabase: supabase,
    });
    expect(result.cambios).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          campo: "responsable_humano_id",
          anterior: "33333333-3333-4333-8333-333333333333",
          nuevo: "55555555-5555-4555-8555-555555555555",
        }),
        expect.objectContaining({
          campo: "responsable_humano_nombre",
          anterior: "José Ramírez",
          nuevo: "María Gómez",
        }),
      ])
    );
  });
});
