-- Create auditorias table for operable audit records
create table if not exists auditorias (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha_auditoria date null,
  responsable_auditoria text null,
  estado_auditoria text not null check (estado_auditoria in (
    'pendiente',
    'en_revision',
    'conforme',
    'con_observaciones',
    'requiere_correccion',
    'cerrada'
  )),
  observaciones_auditoria text null,
  conformidad_cliente boolean null,
  requiere_correccion boolean not null default false,
  fecha_cierre_tecnico date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists auditorias_caso_id_idx on auditorias(caso_id);

-- Disable RLS to allow service role and authenticated users to query
alter table public.auditorias disable row level security;

-- Grant permissions to authenticated users
grant select, insert, update on public.auditorias to anon, authenticated;

-- Ensure all columns exist (idempotent migration)
alter table auditorias add column if not exists id uuid primary key default gen_random_uuid();
alter table auditorias add column if not exists caso_id uuid not null references casos(id) on delete cascade;
alter table auditorias add column if not exists fecha_auditoria date null;
alter table auditorias add column if not exists responsable_auditoria text null;
alter table auditorias add column if not exists estado_auditoria text not null check (estado_auditoria in (
  'pendiente',
  'en_revision',
  'conforme',
  'con_observaciones',
  'requiere_correccion',
  'cerrada'
));
alter table auditorias add column if not exists observaciones_auditoria text null;
alter table auditorias add column if not exists conformidad_cliente boolean null;
alter table auditorias add column if not exists requiere_correccion boolean not null default false;
alter table auditorias add column if not exists fecha_cierre_tecnico date null;
alter table auditorias add column if not exists created_at timestamptz not null default now();
alter table auditorias add column if not exists updated_at timestamptz not null default now();
