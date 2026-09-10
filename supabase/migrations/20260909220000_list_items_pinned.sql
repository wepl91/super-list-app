-- Items fijados: se muestran en una sección "Fijados" al tope del detalle.
alter table public.list_items add column if not exists pinned boolean not null default false;