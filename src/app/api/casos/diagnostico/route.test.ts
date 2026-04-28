import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeDiagnostico,
  createRequestSupabaseClient,
  createServerSupabaseServiceRoleClient,
  buildDiagnosticoEvent,
  processAutomationEvent,
} = vi.hoisted(() => ({
  executeDiagnostico: vi.fn(),
  createRequestSupabaseClient: vi.fn(),
  createServerSupabaseServiceRoleClient: vi.fn(),
  buildDiagnosticoEvent: vi.fn(),
  processAutomationEvent: vi.fn(),
}));

vi.mock("@/core/application/casos/expediente/diagnostico", () => ({
  executeDiagnostico,
}));

vi.mock("@/core/application/automation", () => ({
  buildDiagnosticoEvent,
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

describe("POST /api/casos/diagnostico", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    executeDiagnostico.mockResolvedValue({
      ok: true,
      caso_id: "caso-1",
      accion: "registrar_diagnostico",
      diagnostico_id: "diag-1",
      cambios: [],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-08T00:00:00.000Z",
        origen: "test",
      },
    });
    buildDiagnosticoEvent.mockReturnValue(null);
    processAutomationEvent.mockResolvedValue(null);
  });

  it("usa service role en development cuando no hay bearer token", async () => {
    process.env.NODE_ENV = "development";
    const devSupabase = { from: vi.fn() };
    createServerSupabaseServiceRoleClient.mockReturnValue(devSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_diagnostico",
          payload: {
            diagnostico: "Diagnostico de prueba",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createServerSupabaseServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(createRequestSupabaseClient).not.toHaveBeenCalled();
    expect(executeDiagnostico).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
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
      new Request("http://localhost/api/casos/diagnostico", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-dev",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_diagnostico",
          payload: {
            diagnostico: "Diagnostico de prueba",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createRequestSupabaseClient).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseServiceRoleClient).not.toHaveBeenCalled();
    expect(executeDiagnostico).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
      }),
      { supabase: requestSupabase }
    );
  });
});
