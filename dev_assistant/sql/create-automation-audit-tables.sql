BEGIN;

CREATE TABLE IF NOT EXISTS public.automation_domain_events (
  id uuid PRIMARY KEY,
  correlation_id uuid NULL,
  event_name text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  caso_id text NULL,
  occurred_at timestamptz NOT NULL,
  source text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_domain_events_caso_id
  ON public.automation_domain_events (caso_id);

CREATE INDEX IF NOT EXISTS idx_automation_domain_events_name_occurred_at
  ON public.automation_domain_events (event_name, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_execution_results (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.automation_domain_events(id) ON DELETE CASCADE,
  correlation_id uuid NULL,
  trigger_name text NOT NULL,
  ok boolean NOT NULL DEFAULT true,
  actions_run jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  executed_at timestamptz NOT NULL,
  origin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_execution_results_event_id
  ON public.automation_execution_results (event_id);

CREATE INDEX IF NOT EXISTS idx_automation_execution_results_trigger_executed_at
  ON public.automation_execution_results (trigger_name, executed_at DESC);

ALTER TABLE public.automation_domain_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_execution_results DISABLE ROW LEVEL SECURITY;

COMMIT;
