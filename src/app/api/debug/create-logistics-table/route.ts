/**
 * DEBUG ENDPOINT: Create logisticas_entrega table
 * Usage: GET /api/debug/create-logistics-table?token=ADMIN_TOKEN
 * THIS IS FOR ADMIN/SETUP ONLY - Remove after verification
 */

import { NextResponse } from "next/server";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";

const ADMIN_TOKEN = process.env.ADMIN_DEBUG_TOKEN || "dev-only-token";

const CREATE_TABLE_SQL = `
BEGIN;

CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id text NOT NULL,
  fecha_programada date NULL,
  responsable text NULL,
  estado_logistico text NOT NULL DEFAULT 'pendiente',
  observacion_logistica text NULL,
  confirmacion_entrega boolean NOT NULL DEFAULT false,
  fecha_entrega timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
  ON public.logisticas_entrega (caso_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
  ON public.logisticas_entrega (estado_logistico, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_id
  ON public.logisticas_entrega (caso_id);

ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.logisticas_entrega TO anon, authenticated;

COMMIT;
`;

export async function GET(request: Request) {
  // Security check - must provide valid admin token
  const token = new URL(request.url).searchParams.get("token");
  
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json(
      { error: "Unauthorized - invalid or missing token" },
      { status: 401 }
    );
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 403 }
    );
  }

  try {
    const supabase = createServerSupabaseServiceRoleClient();

    // 1. Check if table exists
    const { data: existsCheck, error: existsError } = await supabase.rpc(
      "query",
      {
        query: `
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'logisticas_entrega'
          ) as exists;
        `,
      }
    );

    if (existsCheck && existsCheck.exists) {
      return NextResponse.json(
        {
          status: "success",
          message: "Table logisticas_entrega already exists",
          tableExists: true,
        },
        { status: 200 }
      );
    }

    // 2. Create table using raw SQL
    // Note: This requires the service role key to have SQL execution permissions
    const { error: createError } = await supabase.rpc("query", {
      query: CREATE_TABLE_SQL,
    });

    if (createError) {
      // Try alternative: use direct SQL via Supabase client
      // The RPC approach may not work, so we'll try direct SQL
      console.error("RPC approach failed:", createError);

      return NextResponse.json(
        {
          status: "error",
          message:
            "Cannot create table via RPC. Please use Supabase SQL Editor directly.",
          error: createError.message,
          sqlToExecute: CREATE_TABLE_SQL,
          instructions: [
            "1. Go to https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql",
            "2. Click 'New query'",
            "3. Paste the SQL from 'sqlToExecute' field below",
            "4. Click 'Run'",
            "5. Refresh this page to verify",
          ],
        },
        { status: 500 }
      );
    }

    // 3. Verify creation
    const { data: verifyData, error: verifyError } = await supabase
      .from("logisticas_entrega")
      .select("count()")
      .limit(1)
      .single();

    if (verifyError) {
      throw new Error(
        `Table creation verification failed: ${verifyError.message}`
      );
    }

    return NextResponse.json(
      {
        status: "success",
        message: "Table logisticas_entrega created successfully!",
        tableExists: true,
        verifiedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in create-logistics-table:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        sqlToExecute: CREATE_TABLE_SQL,
        instructions: [
          "The table creation failed. Please create it manually:",
          "1. Go to https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql",
          "2. Create a new query",
          "3. Copy and paste the SQL above",
          "4. Click 'Run'",
        ],
      },
      { status: 500 }
    );
  }
}
