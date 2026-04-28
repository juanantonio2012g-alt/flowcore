BEGIN;

CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id uuid PRIMARY KEY,
  caso_id text NOT NULL,
  transition_code text NOT NULL,
  from_stage text NULL,
  to_stage text NULL,
  status text NOT NULL DEFAULT 'resuelta',
  actor text NULL,
  origin text NOT NULL,
  occurred_at timestamptz NOT NULL,
  observacion text NULL,
  evidencia_ref text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_caso_occurred_at
  ON public.workflow_transitions (caso_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_transitions_code_occurred_at
  ON public.workflow_transitions (transition_code, occurred_at DESC);

ALTER TABLE public.workflow_transitions DISABLE ROW LEVEL SECURITY;

COMMIT;
