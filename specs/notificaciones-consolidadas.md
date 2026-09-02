# Notificaciones push de cambios en listas compartidas (consolidadas)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Cuando alguien modifica una lista **compartida**, los demás miembros deben recibir una **notificación push** avisando que esa persona está modificando la lista. Para no inundar de notificaciones (una por toque), los cambios se **acumulan** y se envía **una sola notificación consolidada** por ráfaga con el total de cambios (contador acumulado — decisión del dueño).

## Decisiones tomadas (contestación del dueño)

| Pregunta | Elección |
|---|---|
| Mecánica de agrupación | **Contador acumulado**: se cuenta cuántos cambios hubo en la lista y se envía una notificación tipo "N hizo M cambios en la lista" |
| Qué modificaciones cuentan | **Solo cambios estructurales**: agregar, editar, tachar, eliminar o reordenar items; renombrar la lista. No micro-interacciones de edición |
| Destinatarios | **Todos los demás miembros**: owner y editors de la lista, excepto quien hizo el cambio |

## Estado actual descubierto (brecha clave)

- **NO existe registro de suscripciones push en el cliente.** La tabla `push_subscriptions` hoy se **lee** (para enviar al compartir) pero **nada la escribe** (no hay `PushManager.subscribe` en todo el repo). El spec histórico lo diseñaba pero el componente nunca se commiteó.
- El único envío real es al **compartir una lista** (`notifyUserListShared` en `supabase-actions.ts:198-224`). Ningún cambio de items/listas dispara notificaciones.
- **No hay limpieza de suscripciones inválidas** (404/410 del `web-push` se ignoran).
- El service worker sólo lee `{ title, body, icon }`; `notificationclick` siempre abre `/` (sin ir a la lista concreta).
- La lógica de modificaciones vive en `src/lib/stores/listStore.ts` (mutaciones de items/listas), no hay detección server-side de quién modifica qué.

## Requisitos funcionales

- [x] RF-1: **Registro de push en el cliente**: componente `PushNotificationManager` que (si el navegador lo soporta y hay sesión) pide permiso, se suscribe contra el service worker (`pushManager.subscribe` con `applicationServerKey` = VAPID público) y **guarda la suscripción** en `push_subscriptions` vía server action `savePushSubscription`.
- [x] RF-2: **Indicador visual** de si las notificaciones están activas/denegadas/no-soportadas (no rompe si el navegador no las soporta).
- [x] RF-3: **Detección de cambios estructurales** en las mutaciones del store (`listStore`): al agregar, editar, tachar, eliminar o reordenar items / renombrar lista se llama a la server action `notifyListChanged(listId)`.
- [x] RF-4: **Acumulación por destinatario**: server action que consulta los miembros de la lista (owner + editors, excepto el autor del cambio vía sesión) e incrementa un **contador por (lista, miembro)**.
- [x] RF-5: **Consolidación (flush)**: la notificación se envía cuando a) el contador llega a **3** cambios **o** b) pasan **45s** desde el primer cambio de la ráfaga (debounce temporal). El flush les manda a **todos los demás miembros** una notificación tipo: `"[Nombre] hizo 5 cambios en Mi Lista"`.
- [x] RF-6: **Limpieza de suscripciones inválidas**: al enviar, si `webpush.sendNotification` falla con 404/410 se borra esa suscripción de la tabla.
- [x] RF-7: **Deep link**: el payload del push incluye `url` de la lista (`/lista/[id]`) y el SW la abre al hacer click en la notificación.
- [x] RF-8: No auto-notifica al autor del cambio (se excluye por sesión).

## Requisitos no funcionales

- RNF-1: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-2: Sin dependencias nuevas (usa `web-push`, VAPID y SW ya existentes).
- RNF-3: El gestor de suscripciones no pide permiso repetidamente (una vez denegado, no vuelve a preguntar automáticamente).
- RNF-4: Las server actions nuevas son seguras (verifican sesión real del usuario; nunca confían en ids del cliente).
- RNF-5: La lógica de consolidación está **server-side** (no depende de que el receptor esté online; el emisor sólo reporta el cambio).

## Diseño técnico

### 1) Migración de datos (`supabase/migrations/2026..._list_change_batches.sql`)

Tabla de **contadores de cambios pendientes** por (lista, miembro destinatario). Solo la toca el server (server action con service role); RLS habilitada sin policies cliente.

```sql
create table if not exists public.list_change_batches (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  change_count integer not null default 0,
  first_change_at timestamptz not null default now(),
  last_change_at timestamptz not null default now(),
  unique (list_id, member_id)
);
alter table public.list_change_batches enable row level security;
-- (sin policies: solo el service role la escribe/lee)
```

### 2) `src/components/PushNotificationManager.tsx` (nuevo, client)

- Estado: `permission` (`granted`/`denied`/`default`) + `supported` (feature detection de `Notification` + `navigator.serviceWorker` + `PushManager`).
- Flujo al montar (si hay sesión y `supported` y `permission === "default"`): pedir permiso una vez; si `granted`, `navigator.serviceWorker.ready` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) })` → llamar `savePushSubscription({ endpoint, keys })`.
- Escucha `pushsubscriptionchange` para re-registrar si la sub caduca.
- UI mínima discreta (opcional): los datos ya están en el store de preferencias. Renderea `null` si no hay sesión / no soportado.

### 3) `src/app/supabase-actions.ts` (extensiones)

- `savePushSubscription(subscription: { endpoint: string; keys: { p256dh: string; auth: string } })`:
  - server action; verifica sesión (`getUser`); valida forma; **upsert** en `push_subscriptions` con `{ user_id, endpoint, keys }` (`onConflict: "endpoint"`).
  - notas: `expirationTime` no se persiste (la tabla no tiene columna); el `StoredSubscription` castea en lectura.
- Refactor de `notifyUserListShared(userId, message)` para que:
  - reciba opcionalmente `url` para incluir en el payload (`{ title, body, icon, url }`).
  - **limpie subs inválidas**: en el catch, si `err.statusCode === 404 || 410`, borrar la fila por `endpoint`.
- `notifyListChanged(listId)` (nueva server action):
  1. sesión real del autor vía `createServerSupabaseClient().auth.getUser()`; si no hay, no-op.
  2. leer el nombre de la lista (`lists.name`).
  3. obtener los miembros: owner (`lists.owner_id`) + editors (`list_members` con `list_id`); excluir al autor.
  4. si no quedan otros miembros → no-op.
  5. **upsert de contador** por cada miembro: `insert` en `list_change_batches` con `{ list_id, member_id, change_count: 1 }`; si ya existe, incrementar `change_count` y tocar `last_change_at` (bucle simple con select+update por la PK compuesta; bajo volumen, suficiente).
  6. **flush**: para cada miembro cuyo contador llegó a `>= 3` **o** `last_change_at - first_change_at >= 45s` → componer mensaje `"${displayName(autor)} hizo N cambios en ${nombre}."` y `notifyUserListShared(memberId, msg)`; luego **borrar** la fila del batch.
  7. Devolver un resultado simple para diagnóstico.

> Nota: el paso 6 con debounce temporal se resuelve en el flush (el "45s" se evalúa con timestamps server-side al recibir cambios; la ráfaga continua que ocurre con teclado en minutos cerrará la ventana en el siguiente cambio). Como contingencia barata, el cliente (punto 4) también hace un `setTimeout` de 45s por lista para disparar un flush tardío si quedó un único cambio suelto.

### 4) `src/lib/stores/listStore.ts` (hook de detección)

- Importar `notifyListChanged` y, como flujo de seguridad, envolver el `hadChanged` en cada mutación estructural:
  - `addItem`, `updateItem`, `toggleItem`, `deleteItem`, `sortItems`, `deleteCompletedItems`, `renameList`.
- Para cada lista modificada: llamar `notifyListChanged(listId)` (fire-and-forget con `catch` silencioso; la app sigue funcionando si el push falla).
- **Contingencia del único cambio suelto**: al detectar un cambio, programar un `setTimeout` de 45s (mapa `Map<listId, timeout>` para no duplicar); al expirar, llamar `flushListNotifications(listId)` (una server action liviana que ejecuta el paso 6 del diseño para esa lista sin incrementar contadores).

### 5) `src/app/sw.ts` (service worker)

- Tipar payload `{ title?, body?, icon?, url? }`.
- `showNotification(..., { data: { url } })`.
- `notificationclick`: si `notification.data.url` existe, `clients.openWindow(url)` (o focus a una client ya abierta en esa ruta); fallback: `/`.

### 6) Env / layout

- `PushNotificationManager` montado en `src/app/layout.tsx` dentro del `AuthProvider` (una sola vez); usará `useAuth` para saber si hay sesión.
- Se reutiliza `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (ya existe en `.env.local` y Vercel).

## Criterios de aceptación

- [x] CA-1: Con sesión iniciada y permiso concedido, aparece una suscripción en `push_subscriptions` para ese usuario.
- [x] CA-2: Al tocar 2 items de una lista compartida (ráfaga corta), el otro miembro recibe YA UNA notificación consolidada (no 2) al cumplirse la ventana/umbral.
- [x] CA-3: El mensaje indica cantidad de cambios consolidados ("hizo N cambios en...").
- [x] CA-4: El autor del cambio NO recibe la notificación.
- [x] CA-5: Hacer click en la notificación abre la lista concreta (`/lista/[id]`).
- [x] CA-6: Un endpoint inválido (404/410) se elimina de la tabla la próxima vez que se intenta enviar.
- [x] CA-7: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: migración `list_change_batches` (idempotente) + actualizar `supabase/schema.sql` para reflejar la tabla nueva.
- [x] T-2: `PushNotificationManager` + helper `urlBase64ToUint8Array` (local) + guardado vía `savePushSubscription`.
- [x] T-3: `savePushSubscription`, refactor `notifyUserListShared` (url + limpieza de inválidas), `notifyListChanged` con acumulación y flush, `flushListNotifications`.
- [x] T-4: hooks de llamada en las mutaciones estructurales de `listStore`.
- [x] T-5: SW con `url` en payload y deep-link en `notificationclick`; montaje del manager en layout.
- [x] T-6: verificar `lint`/`tsc`/`build`; commit; push; PR apilado; quitar spec del tmp.

## Notas / decisiones

- **Registro de suscripciones era el hueco principal** (diseñado en specs históricos pero nunca implementado). Este spec lo cierra.
- **Umbral 3 cambios / ventana 45s**: valores por defecto razonables y ajustables en constants; el objetivo es una notificación por ráfaga de edición, no una por tecla.
- **Los contadores se borran tras el flush** (no hay "topo" histórico acumulado infinito).
- **No auto-notifica al autor** (excluido por sesión).
- **Descartado**: delegar la consolidación a una Edge Function o trigger on `list_items`/`lists` — hoy las escrituras pasan por el service sección directa del store; centralizar en server action es más simple y no agrega infraestructura paga.
- Al aplicar, el dueño debe correr la migración SQL en el sandbox (como con `profiles`/`allowlist`).