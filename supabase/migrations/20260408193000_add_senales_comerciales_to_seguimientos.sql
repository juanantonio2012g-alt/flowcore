alter table public.seguimientos
add column if not exists senales_comerciales text[] not null default '{}';
