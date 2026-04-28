import { NextResponse } from "next/server";
import {
  buildSeguimientoEvent,
  processAutomationEvent,
} from "@/core/application/automation";
import { executeSeguimiento } from "@/core/application/casos/expediente/seguimiento";
import {
  serializarErrorCasos,
  serializarSeguimientoResult,
} from "@/core/interfaces/api/casos";
import {
  createRequestSupabaseClient,
  extractBearerToken,
} from "@/lib/supabase/request";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const isDevelopment = process.env.NODE_ENV === "development";

    if (!accessToken && !isDevelopment) {
      return NextResponse.json(
        serializarErrorCasos(
          "El registro de seguimiento requiere una sesion autenticada."
        ),
        { status: 401 }
      );
    }

    const command = await request.json();
    const supabase =
      !accessToken && isDevelopment
        ? createServerSupabaseServiceRoleClient()
        : createRequestSupabaseClient(request);
    const result = await executeSeguimiento(command, {
      supabase,
    });
    const event = buildSeguimientoEvent(result);
    const automation = event ? await processAutomationEvent(event) : null;

    return NextResponse.json(serializarSeguimientoResult(result, automation), {
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
