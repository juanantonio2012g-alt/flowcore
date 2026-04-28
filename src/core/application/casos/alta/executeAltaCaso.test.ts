import { rm } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { executeAltaCaso } from "./executeAltaCaso";

function createSupabaseMockWithClientesError(message: string) {
  const clientesTable = {
    select: () => ({
      limit: async () => ({
        data: null,
        error: { message },
      }),
    }),
  };

  return {
    from: (table: string) => {
      if (table === "clientes") {
        return clientesTable;
      }

      throw new Error(`Tabla inesperada en test: ${table}`);
    },
  };
}

describe("core/application/casos/alta/executeAltaCaso", () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLocalStorePath = process.env.OPENCORE_LOCAL_DEV_STORE_PATH;
  const localStorePath = `/tmp/opencore-execute-alta-${process.pid}.json`;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://mddudcfqqfmpjsmplvww.supabase.co";
    process.env.OPENCORE_LOCAL_DEV_STORE_PATH = localStorePath;
  });

  afterEach(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.OPENCORE_LOCAL_DEV_STORE_PATH = originalLocalStorePath;
    await rm(localStorePath, { force: true });
  });

  it("expone un mensaje operativo cuando Supabase no es alcanzable en produccion", async () => {
    process.env.NODE_ENV = "production";

    const supabase = createSupabaseMockWithClientesError(
      "TypeError: fetch failed"
    );

    const result = await executeAltaCaso(
      {
        cliente: "Cliente Uno",
        canal: "WhatsApp",
        prioridad: "Media",
        descripcion: "Falla electrica en tablero principal",
        actor: "test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(false);
    expect(result.errores[0]?.mensaje).toContain(
      "No se pudo conectar con Supabase"
    );
    expect(result.errores[0]?.mensaje).toContain(
      "mddudcfqqfmpjsmplvww.supabase.co"
    );
    expect(result.errores[0]?.mensaje).toContain("fetch failed");
  });

  it("guarda el caso en almacenamiento local de desarrollo cuando Supabase no esta disponible", async () => {
    process.env.NODE_ENV = "development";

    const supabase = createSupabaseMockWithClientesError(
      "TypeError: fetch failed"
    );

    const result = await executeAltaCaso(
      {
        cliente: "Cliente Uno",
        proyecto: "Proyecto Local",
        canal: "WhatsApp",
        prioridad: "Media",
        descripcion: "Falla electrica en tablero principal",
        actor: "test",
      },
      { supabase: supabase as never }
    );

    expect(result.ok).toBe(true);
    expect(result.decision).toBe("crear");
    expect(result.caso_id).toContain("local-caso-");
    expect(result.cliente_id).toContain("local-cliente-");
    expect(result.errores[0]?.mensaje).toContain(
      "almacenamiento local de desarrollo"
    );
  });
});
