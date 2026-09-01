# Persistencia remota con Supabase (storage + colaboración realtime)

**Estado**: `implemented`
**Versión**: v3
**Fecha**: 2026-08-31

## Contexto / Objetivo

Super List es una PWA offline-first. Hoy toda la data (listas, elementos y suscripción push) vive **solo** en el navegador mediante Zustand `persist` (localStorage) y `localStorage` directo. Esto implica: los datos se pierden al borrar datos del navegador, no hay sincronización entre dispositivos y no existe cuenta de usuario.

Este spec define la integración de **Supabase como capa de persistencia remota (cloud storage)** **y** de **colaboración realtime cross-user**. Supabase aporta: Postgres (datos), Auth (identidad), y Realtime (sincronización en vivo).

La meta es doble:
1. **Persistencia**: las listas del usuario se almacenan en la nube y, manteniendo la experiencia offline, se sincronizan con el dispositivo local.
2. **Colaboración en tiempo real**: dos personas (por ejemplo una pareja) comparten una lista de supermercado y, mientras compran, cuando una **tacha un elemento** en su dispositivo, la otra lo ve **al instante** en el suyo, evitando agarrar las mismas cosas.

Decisiones acordadas por el usuario:
- **D1 — Autenticación**: Opción **A** — Email/Google con login/registro y sesión persistente.
- **D2 — Capa local**: Supabase **COMPLEMENTA** el store local. El local es caché offline + encolado de cambios; se mantiene el enfoque **offline-first**.
- **D3 — Cliente**: **browser** mediante `supabase-js` + `@supabase/ssr` (habilita Realtime desde el cliente).
- **D4 — Roles**: solo **`owner`** (administra: invita/agrega/elimina miembros y la lista) y **`editor`** (el resto de miembros editan/tachan todo). **Sin rol `viewer`** por ahora (sumable después).
- **D5 — Alcance de Realtime**: solo sobre **`list_items`** ahora (lo crítico para tachar en el super). `lists` (nombre/orden/creación/eliminación) queda como **mejora futura** cubierta por el pull al reconectar.
- **D6 — Conflictos**: **last-write-wins** (el último que escribe gana, basado en `updated_at`).
- **D7 — Compartición por email directa (sin invitación)**: el owner escribe el **email** del otro usuario; al guardar se resuelve ese email al `user_id` y se crea la membresía **directamente** en `list_members`. **No** hay envío de correos ni enlaces de aceptación. La otra persona ve la lista automáticamente (vía Realtime o al recargar).
- **D8 — Listas no compartidas**: quedan en la **misma tabla** (`lists`); el owner es la única autoridad y no hay otros miembros. No hay modo local separado.

Alcance de este spec:
- Configurar el cliente de Supabase, Auth y el esquema de base de datos.
- Sincronizar listas y elementos entre el store local (Zustand) y la nube.
- Modelo de membresía/compartición de listas entre usuarios.
- **Agregar miembro por email** (resolución email → `user_id` directa, sin invitación).
- Realtime para propagar cambios de **`list_items`** a los dispositivos conectados.
- Migrar la suscripción push de `localStorage` a Supabase (deuda técnica anotada en `PushNotificationManager.tsx`).

## Requisitos funcionales

- [ ] RF-1: La app se conecta a un proyecto de Supabase usando credenciales de entorno (sin exponer secretos de servicio en el cliente).
- [ ] RF-2: El usuario se autentica con **Email/Google** (login, registro, logout) y su sesión se conserva entre recargas.
- [ ] RF-3: Cada lista tiene un **owner**; los elementos de una lista se almacenan en la base de datos.
- [ ] RF-4: El owner puede **agregar un miembro a una lista escribiendo su email**; el email se resuelve al `user_id` y la membresía se crea directamente en `list_members` (sin invitación ni enlace de aceptación).
- [ ] RF-5: Un usuario puede **tachar/desmarcar un elemento** y ese cambio se propaga **en tiempo real** (Realtime sobre `list_items`) a todos los miembros conectados de la misma lista (el caso "pareja en el super").
- [ ] RF-6: Un miembro puede ver y **editar** (añadir/tachar/modificar/eliminar elementos) las listas de las que es miembro (rol `editor`). El `owner` además puede agregar/remover miembros y eliminar la lista.
- [ ] RF-7: Tras el login, las listas locales existentes se **suben** a la nube (merge inicial sin duplicar).
- [ ] RF-8: Las listas remotas se **cargan** en el store local al iniciar sesión (hidratación cloud).
- [ ] RF-9: La app sigue funcionando **offline** y los cambios se sincronizan cuando hay conexión (pending queue / reconciliación).
- [ ] RF-10: El store local se mantiene como **caché offline**; **la base de datos es la fuente de verdad** para el contenido de las listas compartidas.
- [ ] RF-11: La suscripción push se migra de `localStorage` a una tabla de Supabase asociada al usuario autenticado.

## Requisitos no funcionales

- RNF-1: Los secretos de Supabase (service role) nunca viajan al bundle del cliente.
- RNF-2: Se mantiene la experiencia offline-first existente; la nube / Realtime no bloquean la UI.
- RNF-3: **Row Level Security (RLS)** activado y **basado en membresía**: un usuario solo lee/escribe listas donde es miembro (no solo las que es owner), y las acciones administrativas (agregar/remover miembros, eliminar la lista) las ejerce solo el `owner`.
- RNF-4: Accesibilidad y rendimiento de la carga inicial se mantienen (no bloquear el render por sync).
- RNF-5: Error de red / auth expirada se manejan de forma visible y no pierden datos locales.
- RNF-6: Realtime usa canales privados/RLS para no exponer datos a no-miembros.

## Diseño técnico

### Esquema Supabase (Postgres)

```sql
-- auth.users lo provee Supabase Auth

-- Listas. owner_id es quien creó la lista.
create table public.lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  position int not null default 0,      -- orden en el home (por usuario)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membresía: quién colabora en cada lista y con qué rol.
-- Solo 'owner' | 'editor' (sin 'viewer' por ahora, D4).
create table public.list_members (
  list_id uuid not null references public.lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor',  -- 'owner' | 'editor'
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

-- Elementos de una lista.
create table public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null,
  description text,
  quantity numeric not null default 1,
  unit text,
  completed boolean not null default false,
  position int not null default 0,      -- orden en la lista
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
```

#### RLS basado en membresía
- **`lists`**: `select/update/delete` si `owner_id = auth.uid()` **o** existe fila en `list_members` con el usuario.
- **`list_items`**: accesible (select/insert/update/delete) si el usuario es miembro de la lista, mediante subconsulta a `list_members`.
- **`list_members`**: un usuario puede ver las filas donde es miembro. Solo el `owner` de la lista puede **insertar** (agregar miembro) y **eliminar** (remover) filas de membresía de su lista. Un `editor` no puede gestionar membresías.
- **`push_subscriptions`**: RLS por `auth.uid()`.
- El `owner_id` / `user_id` de filas nuevas se toma de `auth.uid()` vía default **o** política, **nunca** del cliente (evita suplantación). En `list_members`, al agregar un miembro, el `user_id` se resuelve a partir del email por el servidor (ver "Agregar miembro por email").
- Índices: `lists(owner_id, position)`, `list_members(user_id)`, `list_items(list_id, position)`.

### Agregar miembro por email (D7)
- El `owner` introduce el **email** del otro usuario en la app (p. ej. el email de su pareja).
- **Resolución email → `user_id`**: como la tabla `auth.users` no es legible directamente con la clave anon por RLS, la resolución del email a `user_id` se hace **en el servidor** (Server Action o endpoint con rol service/RLS dedicado) buscando el usuario por email y devolviendo el `user_id` **sin exponer datos sensibles del otro usuario**.
- Con el `user_id` resuelto, se inserta la fila en `list_members` (rol `editor`) y la lista queda visible al otro usuario de inmediato.
- Alternativa SQL (si se permite el acceso controlado en el servidor): un helper que haga `select id from auth.users where email = :email`, acotado al flujo de agregación y nunca expuesto al cliente.
- **Edge case — email no registrado**: si el email no corresponde a ningún usuario registrado, la resolución devuelve "no encontrado" y la app muestra un **mensaje de error claro** ("No encontramos una cuenta con ese email"). No se crea ninguna membresía ni lista. Se recomienda además normalizar/validar el email (trim + lowercase) antes de buscar.
- El `list_members` tiene `primary key (list_id, user_id)`, por lo que agregar dos veces al mismo usuario queda protegido a nivel de BD (error único); la UI debe prevenirlo y avisar con mensaje.

### Realtime (colaboración cross-user) — solo `list_items` (D5)
- Uso de **Supabase Realtime** con suscripción a cambios (INSERT/UPDATE/DELETE) **solo en `list_items`**, sobre los canales de las listas donde el usuario es miembro.
- Al recibir un evento Realtime, el store local se **actualiza en segundo plano** con el nuevo estado del elemento (p. ej. `completed: true`), reflejándose al instante en la UI del otro dispositivo.
- Los canales están acotados por RLS: un cliente solo recibe cambios de listas donde es miembro.
- **Fuera del alcance de Realtime (mejora futura)**: cambios en `lists` (nombre, orden, creación/eliminación) no se propagan en vivo; se reflejan mediante el **pull al reconectar** y al recargar. Al agregar un miembro por email, la lista nueva aparece para el otro usuario **al recargar** o por el pull al reconectar.
- Realtime es una **optimización de visualización en vivo** para `list_items`; no sustituye el sync de pull al reconectar para garantizar consistencia offline.

### Estrategia de sync offline-first con Realtime
- **Fuente de verdad**: la base de datos (Postgres) para el contenido de las listas compartidas.
- **Store local (Zustand)**: actúa como **caché offline** y como capa de UI inmediata. Sigue siendo el punto de escritura de la UI, pero sus mutaciones se **propagan a la nube**.
- **Flujo de una mutación online** (p. ej. tachar): optimista → se actualiza el store local al instante → se envía a Supabase → Realtime propaga la confirmación a otros dispositivos.
- **Flujo offline**: la mutación se aplica al store local y se encola como pendiente ("dirty") → al recuperar conexión, el reconciliador envía los cambios (upsert/delete) → Realtime/refetch actualiza los demás dispositivos.
- **Hidratación**: al autenticar, hacer pull de `lists`, `list_items` (de mis listas como owner o miembro) y `list_members` (para conocer el `role` en cada lista), y merge con lo local por `id` estable (el `id` uuid actual es compatible). Los cambios remotos pendientes (de otros colaboradores) se aplican sobre el caché local.
- El `position` (orden de listas e items) se persiste; `reorderLists`/`sortItems` actualizan `position`.
- Al **agregar un miembro por email**, el owner llama a una Server Action que resuelve el email y crea la fila en `list_members`; el resultado (éxito o "usuario no encontrado") se muestra en la UI.
- Arquitectura de carpetas propuesta: `src/lib/supabase/` (cliente, auth, helpers) y `src/lib/sync/` (sync service, reconcilier, suscripciones Realtime).

### Cliente Supabase
- Dependencias: `@supabase/supabase-js`, `@supabase/ssr` (integración App Router + cookies de sesión), `@supabase/realtime-js` (transitivo de supabase-js para Realtime).
- Cliente browser en `src/lib/supabase/client.ts`; helpers de sesión y auth en `src/lib/supabase/`.
- Variables de entorno: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave anon pública, segura en cliente). Secretos de servicio solo para server (fuera de alcance).

### Migración push
- `PushNotificationManager` pasa a guardar la suscripción en `push_subscriptions` (asociada a `auth.uid()`) en lugar de `localStorage`, y la elimina al desuscribirse.

## Criterios de aceptación

- [ ] CA-1: Dado un usuario autenticado (Email/Google), cuando crea/clona/elimina/reordena listas y edita elementos, entonces esos cambios se reflejan en Supabase (verificable en el Dashboard) y sobreviven a borrar datos del navegador.
- [ ] CA-2: Dado un usuario con listas locales previas al login, cuando inicia sesión por primera vez, entonces sus listas se suben a la nube sin duplicarse (queda como owner).
- [ ] CA-3: Dado un segundo dispositivo con la misma cuenta, cuando inicia sesión, entonces ve las mismas listas que el primero.
- [ ] CA-4: Dado que el dispositivo queda sin conexión, cuando el usuario modifica listas/elementos, entonces la app sigue respondiendo y los cambios se envían a la nube al reconectar.
- [ ] CA-5: **Colaboración realtime**: dado un usuario A (owner) que comparte una lista con el usuario B, cuando A tacha un elemento, entonces B lo ve tachado **en tiempo real** (< ~1 s) en su dispositivo, y viceversa.
- [ ] CA-6: **Agregar miembro por email**: dado el owner de una lista, cuando introduce el email de un usuario registrado y lo guarda, entonces se crea la membresía directa en `list_members` y el otro usuario ve la lista en su app (al recargar / por pull).
- [ ] CA-6b: **Email no registrado**: dado el owner de una lista, cuando introduce un email sin cuenta registrada, entonces la app muestra el mensaje "usuario no encontrado" y **no** se crea ninguna membresía.
- [ ] CA-6c: **Roles**: dado un miembro con rol `editor`, cuando intenta agregar/remover miembros o eliminar la lista, entonces la operación es rechazada (RLS); solo el `owner` puede hacerlo.
- [ ] CA-7: **RLS por membresía**: dado un usuario que no es owner ni miembro de una lista, cuando intenta leer/escribir sus filas, entonces no tiene acceso (ni vía cliente ni vía Realtime).
- [ ] CA-8: Dado un usuario, cuando se suscribe a push, entonces la suscripción se almacena en `push_subscriptions` de Supabase asociada a su cuenta, y se elimina al desuscribirse.
- [ ] CA-9: **Conflictos last-write-wins**: dado que dos usuarios editan el mismo elemento casi simultáneamente, entonces prevalece el último `updated_at`.

## Tareas de implementación (derivadas)

- [ ] T-1: Crear el proyecto de Supabase y escalar el esquema (tablas `lists`, `list_members`, `list_items`, `push_subscriptions`, RLS por membresía con roles owner/editor, índices).
- [ ] T-2: Configurar credenciales en el entorno y cliente browser `src/lib/supabase/client.ts` + `@supabase/ssr`.
- [ ] T-3: Añadir autenticación Email/Google (login, registro, logout) y manejo de sesión.
- [ ] T-4: Implementar capa de sync (pull al autenticar + merge) e hidratar `useListStore`.
- [ ] T-5: Implementar persistencia de mutaciones a Supabase (upsert/delete con cola offline / reconciliación, last-write-wins).
- [ ] T-6: Persistir `position` para el orden de listas e items.
- [ ] T-7: Implementar modelo de membresía (`list_members`) con roles `owner`/`editor`.
- [ ] T-8: Implementar **agregar miembro por email**: Server Action de resolución email → `user_id` + creación de membresía (con manejo de "usuario no encontrado").
- [ ] T-9: Integrar Supabase Realtime **solo sobre `list_items`** para propagar cambios a los dispositivos conectados y reflejarlos en el store local.
- [ ] T-10: Migrar la suscripción push de `localStorage` a `push_subscriptions` y limpiar los TODO del código.
- [ ] T-11: Verificar `npm run lint` y `npm run build`; pruebas manuales de los CA (incluida la colaboración en dos dispositivos y el caso de email no registrado).

## Notas / decisiones

- La deuda técnica indicada en `PushNotificationManager.tsx` y en `specs/gestion-de-listas.md` ("Pendiente de implementar: autenticación y persistencia remota (Supabase)") se cubre en este spec.
- **Cambio de fuente de verdad**: con colaboración multi-usuario, el contenido de las listas pasa a basarse en la **BD como fuente de verdad**, manteniendo el store local como **caché offline** y capa de UI inmediata (D2 confirmado).
- El modelo de tipos actual (`List`, `ListItem` en `src/lib/types.ts`) es compatible con el esquema propuesto (uuid + campos). Adiciones clave: `position` (orden persistido), `ownerId` en `List` para representar el owner/membresía.
- El `home-de-listas.md` y el `gestion-de-listas.md` ya se alinearon con este spec: la compartición por email directo (sin invitación), la membresía con `list_members` y el realtime de `list_items` entran en el alcance actual (D7, D4, D5), y ambos referencian este spec en lugar de describir la capacidad como futura.
- El reordenamiento de *listas* es per-user (`lists.position`); el de *items* es por-lista (compartido).
- **Realtime** se limita a `list_items` (D5); los cambios en `lists` se reflejan por pull al reconectar (mejora futura).
- **Agregar miembro por email (D7)**: requiere resolución email → `user_id` en el servidor; el email del otro usuario se usa solo con ese fin y no se expone más allá del mensaje de éxito/error.
- **Listas no compartidas (D8)**: misma tabla `lists`, owner como única autoridad, sin filas extras en `list_members`.

## Decisiones resueltas (aprobadas)

- **D1 — Autenticación**: Email/Google con login/registro y sesión persistente.
- **D2 — Capa local**: Supabase complementa el store local (caché offline + sync); se mantiene offline-first.
- **D3 — Cliente**: browser `supabase-js` + `@supabase/ssr` (habilita Realtime).
- **D4 — Roles**: `owner` (administra membresías y borra la lista) y `editor` (edita/tacha todo). Sin `viewer` por ahora.
- **D5 — Realtime**: solo sobre `list_items`. `lists` por pull al reconectar (mejora futura).
- **D6 — Conflictos**: last-write-wins por `updated_at`.
- **D7 — Compartición por email directa**: se elimina `list_invitations` y todo flujo de invitación/enlace. El owner escribe el email, se resuelve email → `user_id` (servidor) y se crea la membresía directamente en `list_members`. Edge case: email no registrado → error "usuario no encontrado", sin creación de membresía.
- **D8 — Listas no compartidas**: misma tabla `lists`, owner única autoridad; sin modo local separado.
