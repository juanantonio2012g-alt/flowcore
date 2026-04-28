import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoWorklistItem, GetCasosNormalizadosResult } from "../contracts";
import { executeBulkUpdate } from "./executeBulkUpdate";

const { getCasosNormalizados } = vi.hoisted(() => ({
  getCasosNormalizados: vi.fn(),
}));

const { sincronizarResponsableHumanoAutomatico } = vi.hoisted(() => ({
  sincronizarResponsableHumanoAutomatico: vi.fn(),
}));

vi.mock("@/core/application/casos/useCases/getCasosNormalizados", () => ({
  getCasosNormalizados,
}));

vi.mock("./sincronizarResponsableHumanoAutomatico", () => ({
  sincronizarResponsableHumanoAutomatico,
}));

function buildCaso(partial: Partial<CasoWorklistItem> = {}): CasoWorklistItem {
  return {
    id: partial.id ?? "caso-1",
    cliente_id: partial.cliente_id ?? "cliente-1",
    cliente: partial.cliente ?? "Cliente Uno",
    proyecto: partial.proyecto ?? "Proyecto Uno",
    created_at: partial.created_at ?? "2026-04-01T00:00:00.000Z",
    prioridad: partial.prioridad ?? "alta",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    estado_tecnico_real: partial.estado_tecnico_real ?? "diagnosticado",
    estado_comercial_real: partial.estado_comercial_real ?? "en_proceso",
    proxima_accion_real: partial.proxima_accion_real ?? "Llamar",
    proxima_fecha_real: partial.proxima_fecha_real ?? "2026-04-07",
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? "verde",
    requiere_validacion: partial.requiere_validacion ?? false,
    validacion_pendiente: partial.validacion_pendiente ?? false,
    validacion_resuelta: partial.validacion_resuelta ?? true,
    resultado_validacion: partial.resultado_validacion ?? "validado",
    recomendacion_accion: partial.recomendacion_accion ?? "Confirmar visita",
    recomendacion_urgencia: partial.recomendacion_urgencia ?? "media",
    recomendacion_motivo:
      partial.recomendacion_motivo ?? "Hace falta continuidad",
    recomendacion_fecha: partial.recomendacion_fecha ?? "2026-04-08",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    macroarea_motivo:
      partial.macroarea_motivo ?? "Seguimiento comercial activo",
    nivel_confianza_cliente: partial.nivel_confianza_cliente ?? "alta",
    nivel_friccion_cliente: partial.nivel_friccion_cliente ?? "baja",
    desgaste_operativo: partial.desgaste_operativo ?? "bajo",
    claridad_intencion: partial.claridad_intencion ?? "clara",
    probabilidad_conversion: partial.probabilidad_conversion ?? "alta",
    observacion_relacional:
      partial.observacion_relacional ?? "Sin observaciones",
  };
}

function createSupabaseMock(updatedIds: string[]) {
  const casesTable = {
    update: vi.fn(() => ({
      in: vi.fn(() => ({
        select: vi.fn(async () => ({
          data: updatedIds.map((id) => ({ id })),
          error: null,
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
  };
}

describe("executeBulkUpdate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sincronizarResponsableHumanoAutomatico.mockResolvedValue({
      ok: true,
      cambios_aplicados: false,
      cambios: [],
      advertencias: [],
    });
    const caso1 = buildCaso({ id: "caso-1" });
    const caso2 = buildCaso({ id: "caso-2", cliente: "Cliente Dos" });
    getCasosNormalizados.mockResolvedValue({
      items: [caso1, caso2],
      meta: {
        total: 2,
        riesgo_alto: 0,
        sin_proxima_fecha: 0,
        sin_proxima_accion: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
      bulk_items: [],
    } satisfies GetCasosNormalizadosResult);
  });

  it("detecta cuando una actualizacion masiva no afecta todos los casos esperados", async () => {
    const supabase = createSupabaseMock(["caso-1"]);

    const result = await executeBulkUpdate(
      {
        caso_ids: ["caso-1", "caso-2"],
        accion: "actualizacion_manual",
        payload: {
          proxima_fecha: "2026-04-10",
        },
        actor: "coordinador@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.total_actualizados).toBe(1);
    expect(result.total_omitidos).toBe(1);
    expect(
      result.errores.some((error) => error.codigo === "bulk_update_incompleto")
    ).toBe(true);
  });
});
