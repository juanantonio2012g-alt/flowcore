import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeAuditoria,
  createRequestSupabaseClient,
  createServerSupabaseServiceRoleClient,
} = vi.hoisted(() => ({
  executeAuditoria: vi.fn(),
  createRequestSupabaseClient: vi.fn(),
  createServerSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/core/application/casos/expediente/auditoria", () => ({
  executeAuditoria,
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

describe("POST /api/casos/auditoria", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv;
    executeAuditoria.mockResolvedValue({
      ok: true,
      caso_id: "caso-1",
      accion: "registrar_auditoria",
      auditoria_id: "aud-1",
      cambios: [],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-07T00:00:00.000Z",
        origen: "test",
      },
    });
  });

  it("usa service role en development cuando no hay bearer token", async () => {
    process.env.NODE_ENV = "development";
    const devSupabase = { from: vi.fn() };
    createServerSupabaseServiceRoleClient.mockReturnValue(devSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/auditoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_auditoria",
          payload: { estado_auditoria: "pendiente" },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createServerSupabaseServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(createRequestSupabaseClient).not.toHaveBeenCalled();
    expect(executeAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_auditoria",
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
      new Request("http://localhost/api/casos/auditoria", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-dev",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          accion: "registrar_auditoria",
          payload: { estado_auditoria: "pendiente" },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createRequestSupabaseClient).toHaveBeenCalledTimes(1);
    expect(createServerSupabaseServiceRoleClient).not.toHaveBeenCalled();
    expect(executeAuditoria).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        accion: "registrar_auditoria",
      }),
      { supabase: requestSupabase }
    );
  });
});
