import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  executeDiagnosticoValidacion,
  createRequestSupabaseClient,
  createServerSupabaseServiceRoleClient,
} = vi.hoisted(() => ({
  executeDiagnosticoValidacion: vi.fn(),
  createRequestSupabaseClient: vi.fn(),
  createServerSupabaseServiceRoleClient: vi.fn(),
}));

vi.mock("@/core/application/casos/expediente/diagnostico", () => ({
  executeDiagnosticoValidacion,
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

describe("POST /api/casos/diagnostico/validacion", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    executeDiagnosticoValidacion.mockResolvedValue({
      ok: true,
      data: undefined,
      caso_id: "caso-1",
      diagnostico_id: "diag-1",
      cambios: [],
      errores: [],
      advertencias: [],
      metadata: {
        timestamp: "2026-04-06T00:00:00.000Z",
        origen: "test",
      },
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("exige autenticacion real fuera de development", async () => {
    process.env.NODE_ENV = "production";
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico/validacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          diagnostico_id: "diag-1",
          payload: {
            resultado_validacion: "validado",
          },
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(executeDiagnosticoValidacion).not.toHaveBeenCalled();
  });

  it("usa el bypass controlado en development cuando no hay bearer token", async () => {
    process.env.NODE_ENV = "development";
    const devSupabase = { from: vi.fn() };
    createServerSupabaseServiceRoleClient.mockReturnValue(devSupabase);
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico/validacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          diagnostico_id: "diag-1",
          payload: {
            resultado_validacion: "validado",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createServerSupabaseServiceRoleClient).toHaveBeenCalledTimes(1);
    expect(executeDiagnosticoValidacion).toHaveBeenCalledWith(
      expect.objectContaining({
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        actor: "dev_bypass",
      }),
      { supabase: devSupabase }
    );
    expect(createRequestSupabaseClient).not.toHaveBeenCalled();
  });

  it("expone detalle del error en development y lo loguea completo", async () => {
    process.env.NODE_ENV = "development";
    createServerSupabaseServiceRoleClient.mockReturnValue({ from: vi.fn() });
    executeDiagnosticoValidacion.mockRejectedValue(
      new Error("Fallo interno de prueba")
    );
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico/validacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          diagnostico_id: "diag-1",
          payload: {
            resultado_validacion: "validado",
          },
        }),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toBe("Fallo interno de prueba");
    expect(body.message).toBe("Fallo interno de prueba");
    expect(typeof body.stack).toBe("string");
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("mantiene respuesta generica en production ante excepciones", async () => {
    process.env.NODE_ENV = "production";
    createRequestSupabaseClient.mockReturnValue({ from: vi.fn() });
    executeDiagnosticoValidacion.mockRejectedValue(
      new Error("Fallo interno de prueba")
    );
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico/validacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-dev",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          diagnostico_id: "diag-1",
          payload: {
            resultado_validacion: "validado",
          },
        }),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      ok: false,
      error: "Error inesperado",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("preserva message y cause en development aunque rechacen con un objeto no-Error", async () => {
    process.env.NODE_ENV = "development";
    createServerSupabaseServiceRoleClient.mockReturnValue({ from: vi.fn() });
    executeDiagnosticoValidacion.mockRejectedValue({
      message: "Service role invalida",
      stack: "stack-trace-dev",
      cause: {
        message: "JWT malformed",
        stack: "cause-stack-dev",
      },
    });
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/casos/diagnostico/validacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caso_id: "caso-1",
          diagnostico_id: "diag-1",
          payload: {
            resultado_validacion: "validado",
          },
        }),
      })
    );

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Service role invalida");
    expect(body.message).toBe("Service role invalida");
    expect(body.stack).toBe("stack-trace-dev");
    expect(body.cause).toEqual({
      message: "JWT malformed",
      stack: "cause-stack-dev",
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
