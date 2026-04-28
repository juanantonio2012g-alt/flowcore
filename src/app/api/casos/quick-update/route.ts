import { NextResponse } from "next/server";
import {
  buildQuickUpdateEvent,
  processAutomationEvent,
} from "@/core/application/automation";
import { executeQuickUpdate } from "@/core/application/casos";
import {
  serializarErrorCasos,
  serializarQuickUpdateResult,
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
    const result = await executeQuickUpdate(command, {
      supabase,
    });
    const event = buildQuickUpdateEvent(result);
    const automation = event ? await processAutomationEvent(event) : null;

    return NextResponse.json(serializarQuickUpdateResult(result, automation), {
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
