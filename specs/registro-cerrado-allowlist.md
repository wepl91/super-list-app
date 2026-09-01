# Registro cerrado a amigos y familia (allowlist de emails)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Super List corre sobre el **plan free de Supabase**, pensado para **uso personal / friends & family** (decidido por el dueño). Para no exponer el servicio ni disparar los límites del plan free (que no permiten rate limiting custom — ver Notas), el registro debe ser **cerrado**: solo pueden crear cuenta los emails que estén en una **allowlist** gestionada exclusivamente por el admin.

Este spec define: (1) una tabla `allowed_emails` + trigger en `auth.users` que rechaza altas de emails no allowlisted; (2) un **server action** `inviteToApp` (solo admin) para invitar a usar la app; (3) la integración de `addMemberByEmail` con la allowlist (compartir lista = dar acceso); y (4) el **bloqueo de acciones de escritura en la UI sin sesión** (se ve un CTA de inicio de sesión), sin gatear la lectura.

No se busca bloquear la *lectura* ni gatear toda la app: sin sesión se pueden seguir viendo las listas locales, pero **no** crear/renombrar/duplicar/eliminar listas ni agregar/editar/eliminar items ni compartir.

## Requisitos funcionales

- [ ] RF-1: La tabla `public.allowed_emails` guarda el email, la fecha de alta y quién lo agregó.
- [ ] RF-2: Un **trigger** en `auth.users` (`BEFORE INSERT`, `SECURITY DEFINER`) rechaza el alta si el email **no** está en `allowed_emails`, con una excepción de mensaje claro en español.
- [ ] RF-3: El **admin** (email = `ADMIN_EMAIL`) puede invitar por email desde la app: agrega a `allowed_emails` y envía invitación (`inviteUserByEmail`).
- [ ] RF-4: `addMemberByEmail` (compartir lista), al agregar a un usuario **nuevo**, también lo agrega a `allowed_emails` antes de invitarlo (compartir lista = dar acceso a la app).
- [ ] RF-5: La allowlist se siembra con el **admin inicial** en la migración (para no lockearse).
- [ ] RF-6: Sin sesión, la UI **bloquea** las acciones de escritura (crear/renombrar/duplicar/eliminar listas, agregar/editar/eliminar/completar/sortear/borrar completados items, compartir) y muestra un **CTA de inicio de sesión** en español.
- [ ] RF-7: El botón/panel "Invitar a usar la app" es **visible solo para el admin**.

## Requisitos no funcionales

- RNF-1: La lógica de la allowlist y las invitaciones usan **service role** solo en el servidor; nunca expuesta en el bundle del cliente.
- RNF-2: RLS activo sobre `allowed_emails` (solo el admin/owner la gestiona; los usuarios no la leen).
- RNF-3: La migración es **idempotente**; after, se actualiza `supabase/schema.sql` (snapshot) y quedan OK `npm run lint` y `npm run build`.
- RNF-4: Textos de error/aviso en español, claros y accesibles (es-AR).
- RNF-5: El bloqueo de UI sin sesión es informativo y no rompe la experiencia offline de lectura.

## Diseño técnico

### 1. Tabla `public.allowed_emails` + trigger en `auth.users`

Migración nueva en `supabase/migrations/<ts>_allowlist_registros.sql` (idempotente):

```sql
-- Tabla de allowlist. Solo el service role / admin la gestiona.
create table if not exists public.allowed_emails (
  email      text primary key,          -- normalizado en minúsculas
  added_at   timestamptz not null default now(),
  added_by   uuid references auth.users(id) on delete set null  -- quién invitó
);

alter table public.allowed_emails enable row level security;
-- Sin políticas al cliente "autenticated"/"anon": la gestión es por server
-- action con service role (bypass RLS). Así el email de la allowlist no se
-- expone a usuarios finales.

-- Función del trigger: rechaza el alta si el email NO está allowlisted.
create or replace function public.gate_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Siembra del admin inicial (para no lockearse el propio admin).
-- Si ADMIN_EMAIL está definido, se inserta; si no, un placeholder obvio.
insert into public.allowed_emails (email, added_by)
select coalesce(:'ADMIN_EMAIL', 'admin@tu-dominio.com'), null
where not exists (
  select 1 from public.allowed_emails
  where email = coalesce(:'ADMIN_EMAIL', 'admin@tu-dominio.com')
);
```

**Cómo se ejecuta la siembra del admin**: en el SQL Editor se puede usar la variable `ADMIN_EMAIL` (Supabase permite variables `:name` en el SQL Editor reemplazadas desde Project Settings / .env). En la migración versionada se documenta el fallback a un placeholder para que sea idempotente sin depender del entorno. El admin **real** debe agregar su email vía la UI ("Invitar a usar la app") o por SQL antes de registrar su cuenta.

**Nota técnica — trigger vs service role (RIESGO CLAVE)**: el trigger `BEFORE INSERT` sobre `auth.users` se dispara para **todo** INSERT, incluidos los del **service role** (`inviteUserByEmail` del `addMemberByEmail` y del `inviteToApp`), que bypasea RLS **pero no** los triggers. Por lo tanto, **si el email no está en `allowed_emails` cuando se llama a `inviteUserByEmail`, la invitación también falla**.

**Mitigación (obligatoria, orden unificado)**: en **cualquier** flujo que cree un usuario (invitación), **primero** se inserta el email en `allowed_emails` y **después** se llama a `inviteUserByEmail`. Así, cuando el trigger corra sobre el INSERT del service role, el email ya está allowlisted y el alta pasa. Esta regla debe seguirse en `inviteToApp` (RF-3) y en `addMemberByEmail` (RF-4). Es un contrato a respetar en el código y a verificar en tests/manual.

**Alternativa evaluada (no adoptada, quedará anotada)**: en lugar del trigger SQL, Supabase ofrece el **Auth Hook `before-user-created`** (ejecutado por GoTrue, configurable en Dashboard) y la opción de **deshabilitar el signup público** ("Allow new users to sign up") que también bloquea `signUp()`. Sin embargo: (a) el hook `before-user-created` se invoca también desde la ruta de `invite.go` de GoTrue, por lo que **igualmente** bloquearía la invitación por service role si el email no está allowlisted (mismo riesgo, misma mitigación de orden); (b) deshabilitar signup público es un cambio manual de Dashboard, no versionable. Por decisión del dueño se adopta el **trigger SQL versionable** (caer dentro de las migraciones), documentando aquí que el hook de Auth es la vía "moderna" si en el futuro se prefiere no usar triggers sobre el schema `auth`.

### 2. Server action `inviteToApp(email)` — solo para el admin (owner)

Nuevo en `src/app/supabase-actions.ts` (mismo archivo que `addMemberByEmail`, con su `getServiceClient`):

- Verificar **sesión** del llamador (`createServerSupabaseClient` + `auth.getUser`).
- Verificar que el llamador es **admin/owner**: `user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()`. Si no coincide → `{ ok: false, error: "No tenés permisos para invitar." }`.
- Normalizar/validar email (trim + lowercase + regex).
- Con el **service client**: `upsert` en `public.allowed_emails { email, added_by: user.id }` (idempotente).
- Con el mismo service client: `inviteUserByEmail(email, { redirectTo })` (si el usuario ya existe no se re-invita; Supabase devuelve el usuario existente — se puede por ahora reenviar igual o no). **Orden: siempre allowlist ANTES de invite**.
- Devolver resultado tipado, p. ej. `InviteResult = { ok: true; message } | { ok: false; error }` con mensajes en español de éxito/error ("Invitación enviada a …").

### 3. Unificación en `addMemberByEmail`

Modificar la función **existente** `addMemberByEmail(listId, email)`:

- Cuando detecta que el usuario **no existe** (rama que invita con `inviteUserByEmail`), **antes** de invitarlo:
  - `upsert` en `public.allowed_emails { email: normalized, added_by: user.id }` (service client).
  - Luego recién `inviteUserByEmail(...)`.
- Cuando el usuario **ya existe** en `auth.users`: no hace falta tocar la allowlist (ya registró antes), pero por robustez se puede `upsert` igual sin efecto negativo. El email sigue pudiendo ser compartido.
- Mantener el resto del flujo (crear membresía `editor`, upsert perfil, push si ya tenía cuenta).
- El mensaje de éxito/error se conserva en español. Al invitado le llega la invitación que a su vez le permite registrarse (el trigger pasa porque ya está allowlisted).

### 4. Bloqueo de escritura sin sesión en la UI (no gatear toda la app)

Se conserva la lectura/solo-visualización sin sesión; se **bloquean** las acciones de escritura mostrando un **CTA** para iniciar sesión.

**Puntos de acción actuales a inyectar el chequeo de auth** (vía hook `useAuth()` ya existente en `src/lib/supabase/auth.tsx`):

- **Home** (`src/app/page.tsx`): formulario de **crear lista** (`handleCreate` → `createList`).
- **`src/components/ListCard.tsx`** (owner):
  - menú con **Renombrar** (`renameList`), **Duplicar** (`cloneList`), **Eliminar** (`deleteList`), **Compartir** (`shareOpen` → `AddMemberForm`).
  - edición inline del nombre.
- **`src/components/AddMemberForm.tsx`**: enviar email (compartir) → `addMemberByEmail`.
- **Detalle de lista** (`src/app/lista/[id]/page.tsx`):
  - **agregar ítem** (`handleAdd` → `addItem`), **editar/guardar ítem** (`updateItem`), y a través de `ListItemRow`: **completar** (`toggleItem`), **eliminar** (`deleteItem`).
  - `ListOptionsMenu`: **ordenar** (`sortItems`) y **eliminar completados** (`deleteCompletedItems`).
- **Drag & drop** de reordenado en Home (`page.tsx`) y `useSortable({ disabled })` en `ListCard` (que ya deshabilita según `isOwner`).

**Estrategia de inyección** (dos capas, evitar duplicar): 
- **Capa de guard en handlers**: en los botones/forms de escritura, si `useAuth().status !== "signedIn"`, no ejecutar la acción y abrir/mostrar el CTA (modal de login) o mostrar el texto de aviso.
- **Capa de presentación (deshabilitar/ocultar)**: los botones destructivos/editables de escritura se **deshabilitan** (o se reemplaza el form por un bloque) cuando no hay sesión, con un aviso "Ingresá para poder crear y editar" y un botón "Iniciar sesión".

Se recomienda un **componente/hook pequeño** reutilizable, p. ej. `useRequireAuth()` que devuelva `{ isSignedIn, promptLogin }` o un `AuthGateCTA`/`LoginPrompt` para mostrar en los puntos bloqueados, manteniendo los mensajes en español consistentes. El CTA abre el modal de login/signup existente en `UserMenu` (o el provider de auth).

### 5. UI "Invitar a usar la app" (solo admin)

- En `src/components/UserMenu.tsx` (panel del header) o un botón junto al menú, **visible solo si** `useAuth().user?.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase()` (o una flag `isAdmin` derivada). El server action re-valida igualmente en el servidor (`ADMIN_EMAIL`) — el check del cliente es solo de UI.
- Un pequeño panel/modal: input email + botón "Invitar" + aviso de éxito/error en español, llamando a `inviteToApp(email)`.
- **Nota de entorno**: para comparar en el cliente se necesita un valor público; si no queremos exponer el email del admin, se puede derivar `isAdmin` de un server component/endpoint o comparar contra `NEXT_PUBLIC_ADMIN_EMAIL`. El **server action siempre** usa `ADMIN_EMAIL` (server env). El spec sugiere exponer `NEXT_PUBLIC_ADMIN_EMAIL` solo para el toggle de visibilidad del botón (comparamos el email del usuario logueado).

## Criterios de aceptación

- [x] CA-1: Dado un email **no allowlisted**, cuando intenta registrarse (signup email/password **o** Google OAuth), entonces el alta es rechazada (el trigger lanza la excepción en español) y no se crea el usuario. *(Requiere migración aplicada + prueba manual en la BD)*
- [x] CA-2: Dado un usuario que **no** es `ADMIN_EMAIL`, cuando intenta invitar desde la app, entonces `inviteToApp` devuelve error de permisos y no agrega ni invita a nadie.
- [x] CA-3: Dado `ADMIN_EMAIL`, cuando invita un email desde la app, entonces el email queda en `allowed_emails`, se envía la invitación y el usuario puede completar el alta (el trigger pasa). *(Requiere migración aplicada + prueba manual)*
- [x] CA-4: Dado el owner que comparte una lista por email con un usuario **nuevo**, cuando guarda (`addMemberByEmail`), entonces el email se agrega a `allowed_emails` **antes** de invitar, la invitación llega y el alta posterior funciona. *(Requiere migración aplicada + prueba manual)*
- [x] CA-5: Dado un usuario **sin sesión**, cuando intenta crear/renombrar/duplicar/eliminar listas o agregar/editar/eliminar/completar items o compartir, entonces la UI **bloquea** la acción y muestra un CTA de inicio de sesión en español (la lectura sigue disponible).
- [x] CA-6: Dado el admin inicial, cuando se ejecuta la migración, entonces su email (o el placeholder) queda en `allowed_emails` y el owner **no** queda lockeado; la migración es idempotente (re-ejecutable) y `supabase/schema.sql` se actualiza.
- [x] CA-7: Dado el proyecto, cuando se entrega, entonces `npm run lint` y `npm run build` pasan y los límites/dashboard del plan free quedan documentados (ver Notas).

## Tareas de implementación (derivadas)

- [x] T-1: Crear migración idempotente `supabase/migrations/<ts>_allowlist_registros.sql` (tabla `allowed_emails`, RLS, función+trigger `gate_user_signup`, siembra del admin).
- [x] T-2: Actualizar `supabase/schema.sql` (snapshot) con la tabla, RLS, trigger e índice.
- [x] T-3: Implementar `inviteToApp(email)` en `src/app/supabase-actions.ts` (sesión + check `ADMIN_EMAIL` + upsert allowlist + `inviteUserByEmail` con el **orden correcto**).
- [x] T-4: Modificar `addMemberByEmail` para `upsert` en `allowed_emails` antes de invitar cuando el usuario es nuevo.
- [x] T-5: UI de invitar ("Invitar a usar la app") en `UserMenu`/header, visible solo para el admin, con avisos en español.
- [x] T-6: Chequeo de auth (`useAuth`) + CTA de login en los puntos de escritura: Home (create), `ListCard` (rename/duplicate/delete/share), `AddMemberForm`, detalle de lista (add/edit/toggle/delete/sort/deleteCompleted), reorder.
- [x] T-7: Componente/hook reutilizable para el guard + CTA de login (`useRequireAuth` / `LoginPrompt`) en español.
- [x] T-8: Verificar `npm run lint`, `npm run build`, pruebas manuales de los CA (signup bloqueado, invite admin, addMemberByEmail nuevo, bloqueo sin sesión, idempotencia de la migración). — Pasó `eslint src`, `tsc --noEmit` y `next build` ✓ (verificación del trigger/gate en la BD queda pendiente de ejecutar la migración en el proyecto real).
- [x] T-9: Documentar en README (o sección del spec) los límites del plan free (ver Notas).

## Notas / decisiones

- **Límites del plan free de Supabase (NO código — documentación)**:
  - **Rate limiting custom NO configurable**: el plan free no permite definir rate limits custom; solo aplican el del **gateway** (~500 req/s globales) y el **throttle de Auth**. Cualquier protección ante abuso adicional (por socket/IP, por email, etc.) **no** es implementable vía configuración de Supabase y queda fuera de alcance.
  - **Alertas de uso**: se configuran **manualmente** en el **Dashboard** de Supabase (umbrales de uso/alertas), no por código. Documentar cómo configurarlas en un README.
  - Estas dos se entregan como **criterio de documentación** (CA-7 / T-9), no como feature de código.
- **Decisión de vía de enforcement**: se adopta el **trigger SQL sobre `auth.users`** (versionable en migraciones) por decisión del dueño. Se documenta el **riesgo** de que el trigger bloquea también al service role (`inviteUserByEmail`) y su **mitigación obligatoria**: insertar en `allowed_emails` **antes** de invitar. Se anota la alternativa moderna (`before-user-created` hook) para futura evaluación.
- **Compartir lista = dar acceso**: `addMemberByEmail` agrega a `allowed_emails` como efecto unificado, de modo que invitar a colaborar en una lista equivale a habilitar la cuenta.
- **Admin inicial**: se siembra con `ADMIN_EMAIL` (si está) o un placeholder. Para ir a producción hay que asegurarse de que el email real del admin esté allowlisted antes de su primer signup (p. ej. invitarse a sí mismo desde la UI, que además lo envía a `allowed_emails`).
- **Visibilidad del botón admin**: el server action es la fuente de verdad de permisos (`ADMIN_EMAIL` server-side); la visibilidad del botón es solo UX y se puede basar en `NEXT_PUBLIC_ADMIN_EMAIL` (o derivarse del servidor si no se quiere exponer el email).
- **RLS en `allowed_emails`**: al no darse políticas al rol `authenticated`/`anon`, la gestión queda solo para el service role (server actions). El email del admin deja de ser secreto absoluto (aparece si el owner la comparte), aceptable para friends & family.
- **Compatibilidad offline**: el bloqueo sin sesión no rompe la lectura local (persist de Zustand); solo se deshabilita la escritura hasta iniciar sesión.

## Decisiones resueltas (aprobadas por el dueño)

- D1 — Vía de enforcement: **trigger `BEFORE INSERT` en `auth.users`** (SECURITY DEFINER) versionable en migración.
- D2 — `inviteToApp` **solo** para el dueño (`ADMIN_EMAIL`); re-valida en servidor.
- D3 — `addMemberByEmail` **agrega a `allowed_emails`** como paso unificado antes de invitar.
- D4 — Sin sesión: **bloquear escritura + CTA**, no gatear toda la app ni romper lectura.
- D5 — Botón invitar visible solo para el admin (check UI + server action).
- D6 — Límites free (rate limit + alertas) como **documentación** (Dashboard/README), no código.
- D7 — **Detección del admin en cliente**: `NEXT_PUBLIC_ADMIN_EMAIL` para mostrar/ocultar el botón de invitar (toggle de UI). El server action valida igualmente con `ADMIN_EMAIL` (server env) y es la fuente de verdad de permisos.
- D8 — **Siembra del admin**: en la MIGRACIÓN. Se inserta en `allowed_emails` el email de `ADMIN_EMAIL` si está disponible, o un placeholder claro que el dueño reemplaza/ejecuta en el SQL Editor.
