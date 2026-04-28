import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { executeSeguimiento } from "./executeSeguimiento";

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
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "administracion",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "Gestión comercial",
      descripcion: "Caso en negociación",
    },
    proxima_accion: partial.proxima_accion ?? "Continuar gestión comercial",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-07",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Continuar gestión comercial",
      urgencia: "media",
      motivo: "El caso ya tiene propuesta y seguimiento",
      fecha_sugerida: "2026-04-08",
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
      estado_comercial_real: "negociacion",
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
      macroarea_motivo: "Caso en negociación",
    },
  };
}

function createSupabaseMock(args?: {
  workflowTransitionsData?: Array<{ id: string; transition_code: string }>;
  existingWorkflowTransitions?: Array<{ transition_code: string }>;
  existingSeguimiento?: Partial<{
    id: string;
    caso_id: string;
    fecha: string | null;
    tipo_seguimiento: string | null;
    resultado: string | null;
    proximo_paso: string | null;
    proxima_fecha: string | null;
    estado_comercial: string | null;
    senales_comerciales: string[] | null;
    observaciones_cliente: string | null;
    created_at: string | null;
  }> | null;
}) {
  const seguimientoInsertResult = { data: { id: "seg-1" }, error: null };
  const casoUpdateResult = { data: { id: "caso-1" }, error: null };
  const bitacoraInsertResult = { error: null };
  const seguimientoUpdateResult = { data: { id: "seg-1" }, error: null };
  const seguimientoExistingResult = {
    data:
      args && "existingSeguimiento" in args
        ? args.existingSeguimiento
          ? {
              id: args.existingSeguimiento.id ?? "seg-1",
              caso_id: args.existingSeguimiento.caso_id ?? "caso-1",
              fecha: args.existingSeguimiento.fecha ?? "2026-04-02",
              tipo_seguimiento:
                args.existingSeguimiento.tipo_seguimiento ?? "correo",
              resultado:
                args.existingSeguimiento.resultado ?? "Cliente rechazó la propuesta",
              proximo_paso:
                args.existingSeguimiento.proximo_paso ?? "Dar seguimiento comercial",
              proxima_fecha:
                args.existingSeguimiento.proxima_fecha ?? "2026-04-09",
              estado_comercial:
                args.existingSeguimiento.estado_comercial ?? "rechazado",
              senales_comerciales:
                args.existingSeguimiento.senales_comerciales ?? [],
              observaciones_cliente:
                args.existingSeguimiento.observaciones_cliente ??
                "No aprueba presupuesto",
              created_at:
                args.existingSeguimiento.created_at ?? "2026-04-02T00:00:00.000Z",
            }
          : null
        : null,
    error: null,
  };
  const workflowTransitionsInsertResult = {
    data:
      args?.workflowTransitionsData ??
      [{ id: "wf-1", transition_code: "cliente_aprobo" }],
    error: null,
  };
  const workflowTransitionsExistingResult = {
    data:
      args?.existingWorkflowTransitions ??
      ([] as Array<{ transition_code: string }>),
    error: null,
  };

  const seguimientosTable = {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => seguimientoInsertResult),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => seguimientoUpdateResult),
          })),
        })),
      })),
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => seguimientoExistingResult),
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
      if (table === "seguimientos") return seguimientosTable;
      if (table === "casos") return casosTable;
      if (table === "bitacora_cambios_caso") return bitacoraTable;
      if (table === "workflow_transitions") return workflowTransitionsTable;
      throw new Error(`Tabla inesperada en test: ${table}`);
    }),
    seguimientosTable,
    casosTable,
    workflowTransitionsTable,
  };
}

describe("executeSeguimiento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCasoNormalizadoById.mockResolvedValue(buildCaso());
  });

  it("persiste cliente_aprobo cuando el seguimiento confirma aprobación comercial", async () => {
    const supabase = createSupabaseMock();

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          tipo_seguimiento: "llamada",
          resultado: "Cliente aprobó la propuesta",
          estado_comercial: "aprobado",
          proximo_paso: "Coordinar entrega",
          proxima_fecha: "2026-04-10",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cliente_aprobo",
        from_stage: "gestion_comercial",
        to_stage: "logistica_entrega",
        evidencia_ref: "seg-1",
      }),
    ]);
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_comercial: "aprobado",
        proxima_accion: "Coordinar entrega",
        proxima_fecha: "2026-04-10",
      })
    );
  });

  it("no duplica cliente_aprobo cuando la transición ya existe y se reejecuta un seguimiento aprobado", async () => {
    const supabase = createSupabaseMock({
      existingSeguimiento: {
        id: "seg-1",
        caso_id: "caso-1",
        tipo_seguimiento: "llamada",
        resultado: "Cliente aprobó la propuesta",
        estado_comercial: "aprobado",
        observaciones_cliente: "Aprobado",
      },
      existingWorkflowTransitions: [{ transition_code: "cliente_aprobo" }],
    });

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "actualizar_seguimiento",
        seguimiento_id: "seg-1",
        payload: {
          observaciones_cliente: "Se confirma aprobación definitiva",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).not.toHaveBeenCalled();
  });

  it("sincroniza logistica_entrega al actualizar un seguimiento aprobado sin arrastrar continuidad comercial vieja", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsData: [
        { id: "wf-1", transition_code: "cliente_aprobo" },
      ],
      existingSeguimiento: {
        id: "seg-1",
        caso_id: "caso-1",
        tipo_seguimiento: "llamada",
        resultado: "Cliente interesado",
        proximo_paso: "Dar seguimiento comercial",
        proxima_fecha: "2026-04-09",
        estado_comercial: "en_proceso",
        senales_comerciales: ["negociacion"],
        observaciones_cliente: "Pendiente",
      },
    });

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "actualizar_seguimiento",
        seguimiento_id: "seg-1",
        payload: {
          estado_comercial: "aprobado",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.seguimientosTable.update).toHaveBeenCalledWith({
      estado_comercial: "aprobado",
      senales_comerciales: [],
    });
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_comercial: "aprobado",
        proxima_accion: "Coordinar ejecución o entrega",
        proxima_fecha: null,
      })
    );
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cliente_aprobo",
        to_stage: "logistica_entrega",
      }),
    ]);
  });

  it("persiste cliente_rechazo y cierre_sin_conversion cuando el cliente rechaza", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsData: [
        { id: "wf-1", transition_code: "cliente_rechazo" },
        { id: "wf-2", transition_code: "cierre_sin_conversion" },
      ],
    });

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          tipo_seguimiento: "correo",
          resultado: "Cliente rechazó la propuesta",
          estado_comercial: "rechazado",
          observaciones_cliente: "No aprueba presupuesto",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cliente_rechazo",
        to_stage: "gestion_comercial",
      }),
      expect.objectContaining({
        transition_code: "cierre_sin_conversion",
        to_stage: "cerrado",
      }),
    ]);
    expect(supabase.from).toHaveBeenCalledWith("workflow_transitions");
  });

  it("no duplica transiciones de cierre cuando ya existen y se reejecuta un seguimiento rechazado", async () => {
    const supabase = createSupabaseMock({
      existingSeguimiento: {
        id: "seg-1",
        caso_id: "caso-1",
        tipo_seguimiento: "correo",
        resultado: "Cliente rechazó la propuesta",
        estado_comercial: "rechazado",
        observaciones_cliente: "No aprueba presupuesto",
      },
      existingWorkflowTransitions: [
        { transition_code: "cliente_rechazo" },
        { transition_code: "cierre_sin_conversion" },
      ],
    });

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "actualizar_seguimiento",
        seguimiento_id: "seg-1",
        payload: {
          observaciones_cliente: "Se confirma rechazo definitivo",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.workflowTransitionsTable.insert).not.toHaveBeenCalled();
  });

  it("preserva campos omitidos y sincroniza cierre sin conversion al actualizar un seguimiento rechazado", async () => {
    const supabase = createSupabaseMock({
      workflowTransitionsData: [
        { id: "wf-1", transition_code: "cliente_rechazo" },
        { id: "wf-2", transition_code: "cierre_sin_conversion" },
      ],
      existingSeguimiento: {
        id: "seg-1",
        caso_id: "caso-1",
        tipo_seguimiento: "correo",
        resultado: "Cliente rechazó la propuesta",
        proximo_paso: "Dar seguimiento comercial",
        proxima_fecha: "2026-04-09",
        estado_comercial: "en_proceso",
        senales_comerciales: ["negociacion"],
        observaciones_cliente: "Pendiente",
      },
    });

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "actualizar_seguimiento",
        seguimiento_id: "seg-1",
        payload: {
          estado_comercial: "rechazado",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.seguimientosTable.update).toHaveBeenCalledWith({
      estado_comercial: "rechazado",
      senales_comerciales: [],
    });
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_comercial: "rechazado",
        proxima_accion: "Confirmar cierre del caso",
        proxima_fecha: null,
      })
    );
    expect(supabase.workflowTransitionsTable.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        transition_code: "cliente_rechazo",
      }),
      expect.objectContaining({
        transition_code: "cierre_sin_conversion",
      }),
    ]);
  });

  it("normaliza un estado heredado a en_proceso y separa la señal comercial al registrar seguimiento", async () => {
    const supabase = createSupabaseMock();

    const result = await executeSeguimiento(
      {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          tipo_seguimiento: "llamada",
          resultado: "Cliente sigue negociando condiciones",
          estado_comercial: "negociacion",
        },
        actor: "comercial@test.com",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(supabase.seguimientosTable.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_comercial: "en_proceso",
        senales_comerciales: ["negociacion"],
      })
    );
    expect(supabase.casosTable.update).toHaveBeenCalledWith(
      expect.objectContaining({
        estado_comercial: "en_proceso",
      })
    );
  });
});
