-- migration: list_change_batches (consolidación de notificaciones de cambios)
-- Acumula por (lista, miembro destinatario) cuántos cambios estructurales hubo
-- en una lista compartida, para enviar una sola notificación consolidada.
-- Solo la toca el server (server action con service role); RLS habilitada sin
-- policies para el cliente (que no debe leerla ni escribirla).
-- Idempotente: se puede re-ejecutar.

create table if not exists public.list_change_batches (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  change_count integer not null default 0,
  first_change_at timestamptz not null default now(),
  last_change_at timestamptz not null default now(),
  last_actor_name text,
  unique (list_id, member_id)
);

alter table public.list_change_batches enable row level security;

-- Índice auxiliar para barridos por lista (flush por lista).
create index if not exists list_change_batches_list_idx
  on public.list_change_batches (list_id);