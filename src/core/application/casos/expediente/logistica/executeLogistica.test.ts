import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeLogistica } from "./executeLogistica";

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
    estado: partial.estado ?? "aprobado",
    estado_label: partial.estado_label ?? "Aprobado",
    workflow: partial.workflow ?? {
      caso_id: "caso-1",
      version: 1,
      etapa_actual: "logistica_entrega",
      estado_workflow: "activo",
      etapas: [],
      hitos: [],
      logistica: null,
      continuidad: {
        estado: "pendiente",
        proxima_accion: "Confirmar programación",
        proxima_fecha: null,
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
          descripcion: "Sin bloqueos",
        },
      },
      metadata: {
        created_at: "2026-04-01T00:00:00.000Z",
        updated_at: "2026-04-01T00:00:00.000Z",
        ultima_transicion_at: "2026-04-01T00:00:00.000Z",
        ultima_transicion_por: null,
        derivado_desde: ["casos"],
      },
    },
    macroarea_actual: partial.macroarea_actual ?? "administracion",
    macroarea_siguiente: partial.macroarea_siguiente ?? null,
    macroarea_label: partial.macroarea_label ?? "Administración",
    macroarea_orden: partial.macroarea_orden ?? 4,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "SLA próximo a vencer",
      descripcion: "Caso aprobado esperando logística",
    },
    proxima_accion: partial.proxima_accion ?? "Confirmar programación",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Confirmar programación",
      urgencia: "media",
      motivo: "El caso aprobado necesita abrir su tramo logístico.",
      fecha_sugerida: "2026-04-07",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-06T00:00:00.000Z",
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
      observacion_relacional: "Caso aprobado",
      macroarea_motivo: "Tramo logístico pendiente",
    },
  };
}

function createSupabaseMock(args?: {
  existingLogistica?: Partial<{
    id: string;
    caso_id: string;
    fecha_programada: string | null;
    responsable: string | null;
    estado_logistico: string | null;
    observacion_logistica: string | null;
    confirmacion_entrega: boolean | null;
    fecha_entrega: string | null;
    created_at: string | null;
  }> | null;
}) {
  const logisticaInsertResult = { data: { id: "log-1" }, error: null };
  const logisticaUpdateResult = { data: { id: "log-1" }, error: null };
  const casoUpdateResult = { data: { id: "caso-1" }, error: null };
  const bitacoraInsertResult = { error: null };
  const logisticaExistingResult = {
    data:
      args && "existingLogistica" in args
        ? args.existingLogistica
          ? {
              id: args.existingLogistica.id ?? "log-1",
              caso_id: args.existingLogistica.caso_id ?? "caso-1",
              fecha_programada:
                args.existingLogistica.fecha_programada ?? "2026-04-10",
              responsable: args.existingLogistica.responsable ?? "Operaciones",
              estado_logistico:
                args.existingLogistica.estado_logistico ?? "programado",
              observacion_logistica:
                args.existingLogistica.observacion_logistica ?? "Entrega programada",
              confirmacion_entrega:
                args.existingLogistica.confirmacion_entrega ?? false,
              fecha_entrega: args.existingLogistica.fecha_entrega ?? null,
              created_at:
                args.existingLogistica.created_at ?? "2026-04-06T00:00:00.000Z",
            }
          : null
        : null,
    error: null,
  };

  const logisticasTable = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => logisticaInsertResult),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => logisticaUpdateResult),
          })),
        })),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => logisticaExistingResult),
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

  return {
    from: vi.fn((table: string) => {
      if (table === "logisticas_entrega") return logisticasTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    logisticasTable,
    casosTable,
  };
}

describe("executeLogistica", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("registra logística y sincroniza continuidad de ejecución", async () => {
    const supabase = createSupabaseMock();

    const result = await executeLogistica(
      {
        caso_id: "caso-1",
        accion: "registrar_logistica",
        payload: {
          fecha_programada: "2026-04-10",
          responsable: "Operaciones",
          estado_logistico: "programado",
          observacion_logistica: "Entrega coordinada con cliente",
        },
        actor: "ops@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.logisticasTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        fecha_programada: "2026-04-10",
        responsable: "Operaciones",
        estado_logistico: "programado",
      })
    );
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: "Coordinar ejecución o entrega",
        proxima_fecha: "2026-04-10",
        responsable_actual: "Operaciones",
      })
    );
  });

  it("actualiza de forma parcial sin borrar campos omitidos", async () => {
    const supabase = createSupabaseMock({
      existingLogistica: {
        id: "log-1",
        caso_id: "caso-1",
        fecha_programada: "2026-04-10",
        responsable: "Operaciones",
        estado_logistico: "programado",
        observacion_logistica: "Entrega coordinada",
        confirmacion_entrega: false,
        fecha_entrega: null,
      },
    });

    const result = await executeLogistica(
      {
        caso_id: "caso-1",
        accion: "actualizar_logistica",
        logistica_id: "log-1",
        payload: {
          estado_logistico: "en_ejecucion",
        },
        actor: "ops@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.logisticasTable.update).toHaveBeenCalledWith({
      estado_logistico: "en_ejecucion",
    });
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        proxima_accion: "Ejecutar entrega",
        proxima_fecha: "2026-04-10",
      })
    );
  });
});
