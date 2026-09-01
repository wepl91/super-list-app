-- migration: registro cerrado por allowlist (idempotente: se puede re-ejecutar)
-- Fecha: 2026-09-01
--
-- Objetivo: limitar el registro de la app a un conjunto privado de emails
-- (uso personal / friends & family). Solo pueden crearse usuarios cuyo email
-- esté en public.allowed_emails.
--
-- RIESGO CLAVE: el trigger BEFORE INSERT sobre auth.users se dispara también
-- para los inserts del service role (inviteUserByEmail). Por eso NINGÚN flujo
-- que cree un usuario puede llamar a inviteUserByEmail sin que el email ya
-- esté en allowed_emails ANTES (ver server actions inviteToApp/addMemberByEmail).
--
-- SIEMBRA DEL ADMIN (D8):
--   Este archivo inserta un PLACEHOLDER de admin en allowed_emails.
--   ⚠️ Antes de ir a producción, reemplazá 'admin@tu-dominio.com' por el
--   email real del dueño (en el SQL Editor) o ejecutá este INSERT con tu email.
--   Así el dueño no queda lockeado (el trigger rechaza todo alta no allowlisted).

-- ---------- TABLA allowed_emails ----------

create table if not exists public.allowed_emails (
  email      text primary key,               -- normalizado en minúsculas
  added_at   timestamptz not null default now(),
  added_by   uuid references auth.users(id) on delete set null  -- quién invitó
);

alter table public.allowed_emails enable row level security;
-- Sin políticas para los roles cliente (anon/authenticated): la gestión queda
-- solo para el service role vía server actions. Así el email de la allowlist
-- no se expone a usuarios finales.

-- Índice por added_by (consultas administrativas ocasionales).
create index if not exists allowed_emails_added_by_idx on public.allowed_emails (added_by);

-- ---------- TRIGGER sobre auth.users ----------

-- Función SECURITY DEFINER que corre con privilegios del owner (postgres),
-- por el rol supabase_auth_admin que usa Auth (no podría tocar public).
-- search_path se pinea para seguridad.
create or replace function public.gate_user_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null
     or not exists (
       select 1 from public.allowed_emails
       where lower(email) = lower(new.email)
     ) then
    raise exception 'Este email no está autorizado. Solo se permite el acceso a invitados de amigos y familia.';
  end if;
  return new;
end;
$$;

drop trigger if exists allowlist_gate_user on auth.users;
create trigger allowlist_gate_user
  before insert on auth.users
  for each row execute function public.gate_user_signup();

-- ---------- SIEMBRA DEL ADMIN (placeholder) ----------

insert into public.allowed_emails (email, added_by)
values ('admin@tu-dominio.com', null)
on conflict (email) do nothing;
