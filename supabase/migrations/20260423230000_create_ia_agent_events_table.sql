create table if not exists public.ia_agent_events (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references public.casos(id) on delete cascade,
  agente_ia_id text not null,
  agente_ia_codigo text not null,
  tipo_de_input text not null,
  prioridad_operativa text not null,
  señales_detectadas jsonb not null default '[]'::jsonb,
  sugerencia_operativa jsonb not null,
  accion_recomendada_opcional text null,
  source text not null default 'ia_agent',
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists ia_agent_events_caso_id_created_at_idx
  on public.ia_agent_events (caso_id, created_at desc);

create index if not exists ia_agent_events_agente_codigo_created_at_idx
  on public.ia_agent_events (agente_ia_codigo, created_at desc);
