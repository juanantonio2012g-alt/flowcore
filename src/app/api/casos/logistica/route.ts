import { NextResponse } from "next/server";
import { executeLogistica } from "@/core/application/casos/expediente/logistica";
import {
  serializarErrorCasos,
  serializarLogisticaResult,
} from "@/core/interfaces/api/casos";
import {
  createRequestSupabaseClient,
  extractBearerToken,
} from "@/lib/supabase/request";
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

    const command = await request.json();
    const supabase = isDevelopmentBypass
      ? createServerSupabaseServiceRoleClient()
      : createRequestSupabaseClient(request);
    const result = await executeLogistica(command, { supabase });

    return NextResponse.json(serializarLogisticaResult(result), {
      status: result.ok ? 200 : 400,
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
