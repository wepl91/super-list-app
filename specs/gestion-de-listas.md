# Gestión de Listas (core)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-08-31

## Contexto / Objetivo

Super List es una PWA de listas (tipo to-do / shopping) instalable en el móvil sin pasar por markets, con soporte offline y notificaciones push. Este spec define la capacidad **core** de gestión de listas y sus elementos. La autenticación, persistencia cloud y sincronización (incluida la compartición por email sin invitación) se definen en `specs/supabase-storage.md`.

## Requisitos funcionales

- [ ] RF-1: El usuario puede ver sus listas de elementos.
- [ ] RF-2: El usuario puede añadir un nuevo elemento a una lista, con **nombre**, **descripción** (opcional) y **cantidad a comprar**.
- [ ] RF-3: El usuario puede marcar/desmarcar un elemento como completado.
- [ ] RF-4: El usuario puede eliminar un elemento.
- [ ] RF-5: El usuario puede crear y eliminar listas.
- [ ] RF-6: El usuario puede editar un elemento (nombre, descripción, cantidad).
- [ ] RF-7: El estado de las listas sobrevive al recargar la página y al modo offline.

## Requisitos no funcionales

- RNF-1: La app debe seguir funcionando sin conexión (Service Worker / Serwist).
- RNF-2: Interfaz mobile-first y accesible (teclado, contraste).
- RNF-3: El bundle debe mantenerse ligero para dispositivos móviles.

## Diseño técnico

- Arquitectura: páginas en `src/app/`, componentes en `src/components/`, lógica en `src/lib/`.
- Estado: Zustand con persistencia (`persist` middleware) como capa local; se añadirá sincronización cloud cuando exista backend.
- Datos: modelo de tipos en `src/lib/types.ts` (List, ListItem). El modelo está definido en `specs/home-de-listas.md` (elemento con `name`, `description?`, `quantity`, `unit?`, `completed`).
- App Router de Next.js, headless UI con Tailwind.
- El Home (listado de listas, clonar, eliminar, reordenar) se define en `specs/home-de-listas.md`.

## Criterios de aceptación

- [ ] CA-1: Dado un usuario en la página principal, cuando añade un elemento (nombre, descripción, cantidad y unidad), entonces este aparece en la lista.
- [ ] CA-2: Dado un elemento marcado como completado, cuando recarga la página, entonces el estado completado se conserva.
- [ ] CA-3: Dado que el dispositivo queda sin conexión, cuando el usuario interactúa con sus listas, entonces estas siguen respondiendo y guardan el estado local.

## Tareas de implementación (derivadas)

- [ ] T-1: Definir tipos `List` y `ListItem` en `src/lib/types.ts`.
- [ ] T-2: Crear store Zustand persistente en `src/lib/stores/listStore.ts`.
- [ ] T-3: Refactorizar la página demo en `src/app/page.tsx` para usar el store.
- [ ] T-4: Añadir acciones CRUD completas (añadir, completar, eliminar, crear/borrar lista).
- [ ] T-5: Verificar `npm run lint` y `npm run build`.

## Notas / decisiones

- La página actual `src/app/page.tsx` contiene una demo con lista hardcodeada; se reemplazará por el Home definido en `specs/home-de-listas.md`, y el CRUD de elementos se integrará con ese modelo.
- Cada elemento tiene: `name`, `description?`, `quantity` (número), `unit?` (unidad opcional, ej. kg), `completed`, `createdAt` — alineado con `specs/home-de-listas.md`.
- Se prioriza el modo offline (PWA ya configurada con Serwist y push).
- Pendiente de implementar: autenticación y persistencia remota (Supabase) — ver `specs/supabase-storage.md` (aprobado).
- ToDo (Supabase): la suscripción push se persiste hoy en `localStorage` del cliente y se reenvía con cada envío; al añadir Supabase debe migrarse a la BD y asociarse al usuario autenticado (ver `PushNotificationManager`).
