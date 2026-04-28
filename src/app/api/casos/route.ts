import { NextResponse } from "next/server";
import { executeAltaCaso } from "@/core/application/casos/alta";
import { serializarErrorCasos } from "@/core/interfaces/api/casos";
import { extractBearerToken } from "@/lib/supabase/request";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const isDevelopmentBypass =
      !accessToken && process.env.NODE_ENV === "development";

    if (!accessToken && !isDevelopmentBypass) {
      return NextResponse.json(serializarErrorCasos("No autorizado"), {
        status: 401,
      });
    }

    const supabase = createServerSupabaseServiceRoleClient();
    const command = await request.json();
    const result = await executeAltaCaso(command, { supabase });

    if (!result.ok) {
      return NextResponse.json(
        serializarErrorCasos(
          result.errores[0]?.mensaje ?? "No se pudo guardar el caso."
        ),
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: result.caso_id,
        cliente_id: result.cliente_id,
      },
    });
  } catch (error) {
    return NextResponse.json(
      serializarErrorCasos(
        error instanceof Error ? error.message : "Error inesperado"
      ),
      { status: 500 }
    );
  }
}
