BEGIN;

CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
  id uuid PRIMARY KEY,
  caso_id text NOT NULL,
  fecha_programada date NULL,
  responsable text NULL,
  estado_logistico text NOT NULL DEFAULT 'pendiente',
  observacion_logistica text NULL,
  confirmacion_entrega boolean NOT NULL DEFAULT false,
  fecha_entrega timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
  ON public.logisticas_entrega (caso_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
  ON public.logisticas_entrega (estado_logistico, created_at DESC);

ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;

COMMIT;
