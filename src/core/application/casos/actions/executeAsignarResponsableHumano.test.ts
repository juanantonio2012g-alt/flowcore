import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeAsignarResponsableHumano } from "./executeAsignarResponsableHumano";

const { getCasoNormalizadoById } = vi.hoisted(() => ({
  getCasoNormalizadoById: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasoNormalizadoById", () => ({
  getCasoNormalizadoById,
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
  const readQuery = {
    eq: vi.fn(() => ({
      maybeSingle: vi.fn(async () => ({ data: actual, error: null })),
    })),
  };
  const updateQuery = {
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        maybeSingle: vi.fn(async () => ({ data: { id: "caso-1" }, error: null })),
      })),
    })),
  };
  const casesTable = {
    select: vi.fn(() => readQuery),
    update: vi.fn(() => updateQuery),
  };
  const bitacoraTable = {
    insert: vi.fn(async () => ({ error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "casos") return casesTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      throw new Error(`Tabla inesperada: ${table}`);
    }),
    casesTable,
    bitacoraTable,
  };
}

describe("executeAsignarResponsableHumano", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("asigna por id y resuelve el nombre desde catálogo usando la macroárea oficial", async () => {
    const supabase = createSupabaseMock();

    const result = await executeAsignarResponsableHumano(
      {
        caso_id: "caso-1",
        payload: {
          responsable_humano_id: "33333333-3333-4333-8333-333333333333",
        },
        actor: "admin@test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casesTable.update).toHaveBeenCalledWith({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: expect.any(String),
    });
  });

  it("desasigna limpiando todos los campos formales", async () => {
    const supabase = createSupabaseMock({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: "2026-04-23T00:00:00.000Z",
    });

    const result = await executeAsignarResponsableHumano(
      {
        caso_id: "caso-1",
        payload: {
          responsable_humano_id: null,
        },
        actor: "admin@test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casesTable.update).toHaveBeenCalledWith({
      responsable_humano_id: null,
      responsable_humano_nombre: null,
      responsable_humano_asignado_por: null,
      responsable_humano_asignado_at: null,
    });
  });

  it("reconcilia y limpia una asignación inválida tras cambio de macroárea oficial", async () => {
    getCasoNormalizadoById.mockResolvedValue(
      buildCaso({ macroarea_actual: "comercial", macroarea_label: "Comercial" })
    );
    const supabase = createSupabaseMock({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: "2026-04-23T00:00:00.000Z",
    });

    const result = await executeAsignarResponsableHumano(
      {
        caso_id: "caso-1",
        actor: "admin@test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.casesTable.update).toHaveBeenCalledWith({
      responsable_humano_id: null,
      responsable_humano_nombre: null,
      responsable_humano_asignado_por: null,
      responsable_humano_asignado_at: null,
    });
  });

  it("no reescribe metadata si se reconcilia una asignación vigente y válida", async () => {
    const supabase = createSupabaseMock({
      responsable_humano_id: "33333333-3333-4333-8333-333333333333",
      responsable_humano_nombre: "José Ramírez",
      responsable_humano_asignado_por: "admin@test",
      responsable_humano_asignado_at: "2026-04-23T00:00:00.000Z",
    });

    const result = await executeAsignarResponsableHumano(
      {
        caso_id: "caso-1",
        actor: "admin@test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(result.advertencias[0]?.codigo).toBe("sin_cambios");
    expect(supabase.casesTable.update).not.toHaveBeenCalled();
  });

  it("rechaza asignar una persona de otra macroárea", async () => {
    const supabase = createSupabaseMock();

    const result = await executeAsignarResponsableHumano(
      {
        caso_id: "caso-1",
        payload: {
          responsable_humano_id: "55555555-5555-4555-8555-555555555555",
        },
        actor: "admin@test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.codigo).toBe("responsable_humano_invalido");
    expect(supabase.casesTable.update).not.toHaveBeenCalled();
  });
});
