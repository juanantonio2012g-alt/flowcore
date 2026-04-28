import { NextResponse } from "next/server";
import {
  buildInformeEvent,
  processAutomationEvent,
} from "@/core/application/automation";
import { executeInforme } from "@/core/application/casos/expediente/informe";
import {
  serializarErrorCasos,
  serializarInformeResult,
} from "@/core/interfaces/api/casos";
import {
  createRequestSupabaseClient,
  extractBearerToken,
} from "@/lib/supabase/request";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const command = await request.json();
    const accessToken = extractBearerToken(request.headers.get("authorization"));
    const supabase =
      !accessToken && process.env.NODE_ENV === "development"
        ? createServerSupabaseServiceRoleClient()
        : createRequestSupabaseClient(request);
    const result = await executeInforme(command, {
      supabase,
    });
    const event = buildInformeEvent(result);
    const automation = event ? await processAutomationEvent(event) : null;

    return NextResponse.json(serializarInformeResult(result, automation), {
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
