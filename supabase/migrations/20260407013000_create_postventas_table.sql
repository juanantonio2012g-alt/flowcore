-- Create postventas table for the formal stage between auditoria and cierre tecnico
create table if not exists postventas (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha_postventa date null,
  estado_postventa text not null check (estado_postventa in (
    'abierta',
    'en_seguimiento',
    'requiere_accion',
    'resuelta',
    'cerrada'
  )),
  observacion_postventa text null,
  requiere_accion boolean not null default false,
  proxima_accion text null,
  proxima_fecha date null,
  conformidad_final boolean null,
  responsable_postventa text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists postventas_caso_id_idx on postventas(caso_id);

alter table public.postventas disable row level security;

grant select, insert, update on public.postventas to anon, authenticated;

alter table postventas add column if not exists fecha_postventa date null;
alter table postventas add column if not exists estado_postventa text null;
alter table postventas add column if not exists observacion_postventa text null;
alter table postventas add column if not exists requiere_accion boolean not null default false;
alter table postventas add column if not exists proxima_accion text null;
alter table postventas add column if not exists proxima_fecha date null;
alter table postventas add column if not exists conformidad_final boolean null;
alter table postventas add column if not exists responsable_postventa text null;
alter table postventas add column if not exists notas text null;
alter table postventas add column if not exists created_at timestamptz not null default now();
alter table postventas add column if not exists updated_at timestamptz not null default now();
