-- ============================================================
-- Super List — Esquema Supabase (v3)
-- ============================================================
--
-- ⚠️ CONVENCIÓN IMPORTANTE ⚠️
-- Este archivo es un SNAPSHOT completo del esquema (para setups nuevos).
-- Si ya tenés la base montada, NO ejecutes este archivo ni lo edites para
-- aplicar cambios.
--
-- Cada cambio de schema (tablas, columnas, políticas RLS, índices,
-- realtime, etc.) va en un archivo de migración NUEVO por acción, dentro
-- de supabase/migrations/ con formato <timestamp>_<descripcion>.sql
-- (ej: 202609010001_add_profiles.sql), y se ejecuta por separado en el
-- SQL Editor.
--
-- Las migraciones deben ser IDEMPOTENTES: usar create table if not exists
-- y drop policy if exists antes de cada create policy, para que puedan
-- re-ejecutarse sin errores.
--
-- Después de crear la migración, actualizá ESTE snapshot para que siga
-- reflejando el esquema completo al día.
-- ============================================================

-- ---------- TABLAS ----------

-- Listas. owner_id quien creó la lista.
create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membresía: quién colabora en cada lista y con qué rol ('owner' | 'editor').
create table if not exists public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- Elementos de una lista.
create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  description text,
  quantity numeric not null default 1,
  unit text,
  completed boolean not null default false,
  position int not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfiles: email público resolvable por los owners de listas compartidas.
-- Se usa para mostrar con quién está compartida una lista (RNF). Se mantiene
-- en sincronía con auth.users al compartir y al iniciar sesión.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now()
);

-- Suscripciones push asociadas al usuario.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

-- Índices.
create index if not exists lists_owner_position_idx on public.lists (owner_id, position);
create index if not exists list_members_user_idx on public.list_members (user_id);
create index if not exists list_items_list_position_idx on public.list_items (list_id, position);

-- ---------- ROW LEVEL SECURITY ----------

alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.list_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.profiles enable row level security;

-- profiles: cada usuario puede ver/actualizar/insertar su propio perfil.
-- (Los emails de los miembros se resuelven por server action con service role.)
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid());

-- list_members: ver solo mis membresías.
create policy "list_members_select_own" on public.list_members
  for select using (user_id = auth.uid());

-- list_members: solo el owner de la lista (true owner en `lists`) puede
-- insertar/eliminar miembros. Se ancla en lists.owner_id para que el propio
-- owner pueda auto-registrarse al crear la lista (bootstrap).
create policy "list_members_insert_owner" on public.list_members
  for insert with check (
    exists (
      select 1 from public.lists
      where lists.id = list_members.list_id and lists.owner_id = auth.uid()
    )
  );

create policy "list_members_delete_owner" on public.list_members
  for delete using (
    exists (
      select 1 from public.lists
      where lists.id = list_members.list_id and lists.owner_id = auth.uid()
    )
  );

-- lists: select/update/delete si soy owner o miembro.
create policy "lists_select_member" on public.lists
  for select using (
    owner_id = auth.uid()
    or exists (select 1 from public.list_members lm where lm.list_id = lists.id and lm.user_id = auth.uid())
  );

create policy "lists_insert_owner" on public.lists
  for insert with check (owner_id = auth.uid());

create policy "lists_update_member" on public.lists
  for update using (
    owner_id = auth.uid()
    or exists (select 1 from public.list_members lm where lm.list_id = lists.id and lm.user_id = auth.uid())
  );

create policy "lists_delete_owner" on public.lists
  for delete using (owner_id = auth.uid());

-- list_items: accesible si soy miembro de la lista.
create policy "list_items_select_member" on public.list_items
  for select using (
    exists (select 1 from public.list_members lm where lm.list_id = list_items.list_id and lm.user_id = auth.uid())
  );

create policy "list_items_insert_member" on public.list_items
  for insert with check (
    exists (select 1 from public.list_members lm where lm.list_id = list_items.list_id and lm.user_id = auth.uid())
  );

create policy "list_items_update_member" on public.list_items
  for update using (
    exists (select 1 from public.list_members lm where lm.list_id = list_items.list_id and lm.user_id = auth.uid())
  );

create policy "list_items_delete_member" on public.list_items
  for delete using (
    exists (select 1 from public.list_members lm where lm.list_id = list_items.list_id and lm.user_id = auth.uid())
  );

-- push_subscriptions: solo el dueño de la suscripción.
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update using (user_id = auth.uid());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());

-- Realtime: publicar solo cambios de list_items (D5).
alter publication supabase_realtime add table public.list_items;
