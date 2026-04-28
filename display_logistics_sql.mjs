#!/usr/bin/env node
/**
 * Simple script to display the SQL needed to create logisticas_entrega table
 * Usage: node display_logistics_sql.mjs
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    LOGISTICA/ENTREGA TABLE CREATION SQL                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 COPY-PASTE THIS SQL into Supabase SQL Editor:
  https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 QUICK STEPS:
  1. Go to: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql
  2. Click "New query"
  3. Paste the SQL above
  4. Click "Run"
  5. Done! ✅

📖 For more details, see: LOGISTICA_SOLUCION.md

╚══════════════════════════════════════════════════════════════════════════════╝
`);
