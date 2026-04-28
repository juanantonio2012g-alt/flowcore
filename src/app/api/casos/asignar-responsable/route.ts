import { NextResponse } from "next/server";
import { executeAsignarResponsableHumano } from "@/core/application/casos";
import { serializarErrorCasos } from "@/core/interfaces/api/casos";
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
    const result = await executeAsignarResponsableHumano(command, {
      supabase,
    });

    return NextResponse.json(
      {
        ok: result.ok,
        data: result,
      },
      { status: result.ok ? 200 : 400 }
    );
  } catch (error) {
    return NextResponse.json(
      serializarErrorCasos(
        error instanceof Error ? error.message : "Error inesperado"
      ),
      { status: 500 }
    );
  }
}
