import { NextResponse } from "next/server";
import {
  buildBulkUpdateEvent,
  processAutomationEvent,
} from "@/core/application/automation";
import { executeBulkUpdate } from "@/core/application/casos";
import {
  serializarBulkUpdateResult,
  serializarErrorCasos,
} from "@/core/interfaces/api/casos";
import { createRequestSupabaseClient } from "@/lib/supabase/request";

export async function POST(request: Request) {
  try {
    const command = await request.json();
    const result = await executeBulkUpdate(command, {
      supabase: createRequestSupabaseClient(request),
    });
    const event = buildBulkUpdateEvent(result);
    const automation = event ? await processAutomationEvent(event) : null;

    return NextResponse.json(serializarBulkUpdateResult(result, automation), {
      status: result.ok || result.total_actualizados > 0 ? 200 : 400,
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
