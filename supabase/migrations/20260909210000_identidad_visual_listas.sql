-- Identidad visual de listas: color y emoji elegidos por el owner.
alter table public.lists add column if not exists color text;
alter table public.lists add column if not exists emoji text;