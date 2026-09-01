-- migration: add profiles table (idempotente: se puede re-ejecutar)
-- Fecha: 2026-09-01

-- Limpieza previa por si se aplicó una versión anterior (con políticas que
-- causaban recursión de RLS).
drop policy if exists "list_members_select_owner" on public.list_members;
drop policy if exists "profiles_select_owner_lists" on public.profiles;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid());
