create table if not exists cierres_tecnicos (
  id uuid primary key default gen_random_uuid(),
  caso_id uuid not null references casos(id) on delete cascade,
  fecha_cierre_tecnico date not null,
  responsable_cierre text not null,
  motivo_cierre text null,
  observacion_cierre text null,
  postventa_resuelta boolean not null default false,
  requiere_postventa_adicional boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cierres_tecnicos_caso_id_idx
  on cierres_tecnicos(caso_id);

alter table public.cierres_tecnicos disable row level security;

grant select, insert, update on public.cierres_tecnicos to anon, authenticated;
