import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeCotizacion,
  createRequestSupabaseClient,
  createServerSupabaseServiceRoleClient,
  buildCotizacionEvent,
  processAutomationEvent,
} = vi.hoisted(() => ({
  executeCotizacion: vi.fn(),
  createRequestSupabaseClient: vi.fn(),
  createServerSupabaseServiceRoleClient: vi.fn(),
  buildCotizacionEvent: vi.fn(),
  processAutomationEvent: vi.fn(),
}));

vi.mock("@/core/application/casos/expediente/cotizacion", () => ({
  executeCotizacion,
}));

vi.mock("@/core/application/automation", () => ({
  buildCotizacionEvent,
  processAutomationEvent,
}));

vi.mock("@/lib/supabase/request", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/request")>(
    "@/lib/supabase/request"
  );

  return {
    ...actual,
    createRequestSupabaseClient,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseServiceRoleClient,
}));

describe("POST /api/casos/cotizacion", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    executeCotizacion.mockResolvedValue({
      ok: true,
      caso_id: "caso-1",
      accion: "actualizar_cotizacion",
      cotizacion_id: "cot-1",
      cambios: [],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-06T00:00:00.000Z",
        origen: "test",
      },
    });
    buildCotizacionEvent.mockReturnValue(null);
    processAutomationEvent.mockResolvedValue(null);
  });

  it("usa service role en development cuando no hay bearer token", async () => {
    process.env.NODE_ENV = "development";
    const devSupabase = { from: vi.fn() };
    createServerSupabaseServiceRoleClient.mockReturnValue(devSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/cotizacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "actualizar_cotizacion",
          cotizacion_id: "cot-1",
          payload: {
            estado: "pendiente",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createServerSupabaseServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(executeCotizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        cotizacion_id: "cot-1",
      }),
      { supabase: devSupabase }
    );
    expect(createRequestSupabaseClient).not.toHaveBeenCalled();
  });

  it("mantiene el cliente autenticado por request cuando llega bearer token", async () => {
    process.env.NODE_ENV = "development";
    const requestSupabase = { from: vi.fn() };
    createRequestSupabaseClient.mockReturnValue(requestSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/cotizacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-dev",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "actualizar_cotizacion",
          cotizacion_id: "cot-1",
          payload: {
            estado: "pendiente",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createRequestSupabaseClient).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseServiceRoleClient).not.toHaveBeenCalled();
    expect(executeCotizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        cotizacion_id: "cot-1",
      }),
      { supabase: requestSupabase }
    );
  });
});
