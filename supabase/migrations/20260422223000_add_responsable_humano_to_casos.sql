alter table public.casos
  add column if not exists responsable_humano_id uuid null,
  add column if not exists responsable_humano_nombre text null,
  add column if not exists responsable_humano_asignado_por text null,
  add column if not exists responsable_humano_asignado_at timestamptz null;

create index if not exists idx_casos_responsable_humano_id
  on public.casos (responsable_humano_id)
  where responsable_humano_id is not null;

comment on column public.casos.responsable_humano_id is
  'Identificador de la persona asignada formalmente como responsable humano del caso. No reemplaza macroarea_actual.';

comment on column public.casos.responsable_humano_nombre is
  'Nombre visible de la persona asignada formalmente como responsable humano. Si es null, el caso permanece sin asignacion humana.';

comment on column public.casos.responsable_humano_asignado_por is
  'Actor que registro la asignacion humana formal.';

comment on column public.casos.responsable_humano_asignado_at is
  'Momento en que se registro la asignacion humana formal.';
