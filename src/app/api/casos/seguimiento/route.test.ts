import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeSeguimiento,
  createRequestSupabaseClient,
  createServerSupabaseServiceRoleClient,
  buildSeguimientoEvent,
  processAutomationEvent,
} = vi.hoisted(() => ({
  executeSeguimiento: vi.fn(),
  createRequestSupabaseClient: vi.fn(),
  createServerSupabaseServiceRoleClient: vi.fn(),
  buildSeguimientoEvent: vi.fn(),
  processAutomationEvent: vi.fn(),
}));

vi.mock("@/core/application/casos/expediente/seguimiento", () => ({
  executeSeguimiento,
}));

vi.mock("@/core/application/automation", () => ({
  buildSeguimientoEvent,
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

describe("POST /api/casos/seguimiento", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    executeSeguimiento.mockResolvedValue({
      ok: true,
      caso_id: "caso-1",
      accion: "registrar_seguimiento",
      seguimiento_id: "seg-1",
      cambios: [],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-06T00:00:00.000Z",
        origen: "test",
      },
    });
    buildSeguimientoEvent.mockReturnValue(null);
    processAutomationEvent.mockResolvedValue(null);
  });

  it("usa service role en development cuando no hay bearer token", async () => {
    process.env.NODE_ENV = "development";
    const devSupabase = { from: vi.fn() };
    createServerSupabaseServiceRoleClient.mockReturnValue(devSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/seguimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_seguimiento",
          payload: {
            estado_comercial: "rechazado",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createServerSupabaseServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(createRequestSupabaseClient).not.toHaveBeenCalled();
    expect(executeSeguimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
      }),
      { supabase: devSupabase }
    );
  });

  it("mantiene el cliente autenticado por request cuando llega bearer token", async () => {
    process.env.NODE_ENV = "development";
    const requestSupabase = { from: vi.fn() };
    createRequestSupabaseClient.mockReturnValue(requestSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/seguimiento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-dev",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_seguimiento",
          payload: {
            estado_comercial: "rechazado",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createRequestSupabaseClient).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseServiceRoleClient).not.toHaveBeenCalled();
    expect(executeSeguimiento).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
      }),
      { supabase: requestSupabase }
    );
  });
});
