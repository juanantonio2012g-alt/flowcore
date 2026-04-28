import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { sincronizarResponsableHumanoAutomatico } from "./sincronizarResponsableHumanoAutomatico";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

const { executeAsignarResponsableHumano } = vi.hoisted(() => ({
  executeAsignarResponsableHumano: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
}));

vi.mock("./executeAsignarResponsableHumano", () => ({
  executeAsignarResponsableHumano,
}));

function buildCaso(partial: Partial<CasoNormalizado> = {}): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "diagnostico",
    estado_label: partial.estado_label ?? "Diagnóstico",
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En seguimiento",
      descripcion: "Caso operativo",
    },
    proxima_accion: partial.proxima_accion ?? "Realizar diagnóstico",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Realizar diagnóstico",
      urgencia: "media",
      motivo: "Caso técnico activo",
      fecha_sugerida: null,
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-23T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-23T00:00:00.000Z",
      prioridad: "media",
      estado_tecnico_real: "solicitud_recibida",
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
      nivel_confianza_cliente: "incierta",
      nivel_friccion_cliente: "media",
      desgaste_operativo: "medio",
      claridad_intencion: "media",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo técnico pendiente",
    },
  };
}

function createSupabaseMock(actual = {
  responsable_humano_id: null,
  responsable_humano_nombre: null,
  responsable_humano_asignado_por: null,
  responsable_humano_asignado_at: null,
}) {
  const casesTable = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: actual, error: null })),
      })),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "casos") return casesTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
  };
}

describe("sincronizarResponsableHumanoAutomatico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
    executeAsignarResponsableHumano.mockResolvedValue({
      ok: true,
      caso_id: "caso-1",
      cambios: [
        {
          campo: "responsable_humano_id",
          anterior: null,
          nuevo: "33333333-3333-4333-8333-333333333333",
        },
      ],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-23T00:00:00.000Z",
        origen: "opencore-asignacion-humana",
      },
    });
  });

  it("autoasigna un responsable humano por defecto según la macroárea oficial", async () => {
    const supabase = createSupabaseMock();

    const result = await sincronizarResponsableHumanoAutomatico({
      caso_id: "caso-1",
      actor: "system@test",
      supabase: supabase as never,
    });

    expect(result.ok).toBe(true);
    expect(result.cambios_aplicados).toBe(true);
    expect(executeAsignarResponsableHumano).toHaveBeenCalledWith(
      {
        caso_id: "caso-1",
        payload: {
          responsable_humano_id: "33333333-3333-4333-8333-333333333333",
        },
        actor: "system@test",
      },
      { supabase: supabase }
    );
  });

  it("reemplaza una asignación inválida cuando la macroárea cambia", async () => {
    getCasoNormalizadoById.mockResolvedValue(
      buildCaso({ macroarea_actual: "comercial", macroarea_label: "Comercial" })
    );
    const supabase = createSupabaseMock({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: "2026-04-23T00:00:00.000Z",
    });

    await sincronizarResponsableHumanoAutomatico({
      caso_id: "caso-1",
      actor: "system@test",
      supabase: supabase as never,
    });

    expect(executeAsignarResponsableHumano).toHaveBeenCalledWith(
      {
        caso_id: "caso-1",
        payload: {
          responsable_humano_id: "55555555-5555-4555-8555-555555555555",
        },
        actor: "system@test",
      },
      { supabase: supabase }
    );
  });

  it("no reasigna si ya existe una persona válida y completa para la macroárea actual", async () => {
    const supabase = createSupabaseMock({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: "2026-04-23T00:00:00.000Z",
    });

    const result = await sincronizarResponsableHumanoAutomatico({
      caso_id: "caso-1",
      actor: "system@test",
      supabase: supabase as never,
    });

    expect(result.ok).toBe(true);
    expect(result.cambios_aplicados).toBe(false);
    expect(executeAsignarResponsableHumano).not.toHaveBeenCalled();
  });
});
