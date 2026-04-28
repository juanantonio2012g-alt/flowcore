BEGIN;

-- Drop existing table if it exists (to rebuild correctly)
DROP TABLE IF EXISTS public.logisticas_entrega CASCADE;

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

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.logisticas_entrega TO anon, authenticated;

COMMIT;
