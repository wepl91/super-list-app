# Esconder elementos tachados (preferencia local del dispositivo)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Así como existe la acción de **eliminar** elementos tachados (menú de opciones del detalle), se agrega la posibilidad de **ocultar** los elementos completados: solo ver los pendientes. Es una **preferencia local del dispositivo** (no se sincroniza), igual que el modo foco.

## Requisitos funcionales

- [x] RF-1: Un **toggle** (persistido por dispositivo) oculta los elementos tachados del detalle de lista.
- [x] RF-2: Con la preferencia activa, solo se listan los elementos **pendientes**; el contador de completados (header) se mantiene.
- [x] RF-3: Con la preferencia inactiva (default), se muestran todos como ahora.
- [x] RF-4: Se puede alternar la preferencia desde el detalle de lista (mismo menú/toggle estilo modo foco).

## Requisitos no funcionales

- RNF-1: Usa el store de preferencias locales ya creado (`super-list-preferences`, `hideCompleted`).
- RNF-2: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-3: Sin dependencias nuevas.

## Diseño técnico

- El toggle vive en el detalle de lista (`src/app/lista/[id]/page.tsx`), junto al de modo foco.
- El listado filtra `list.items` con `hideCompleted ? !completed : true`.
- El header continúa mostrando el total y completados reales (no filtrados).
- La preferencia ya existía en `preferencesStore` (`hideCompleted`, setter `setHideCompleted`) creada para el modo foco.

## Criterios de aceptación

- [x] CA-1: Activar ocultar tachados → desaparecen los completados de la vista (persistido por dispositivo).
- [x] CA-2: El contador del header sigue mostrando el total real.
- [x] CA-3: Desactivar → vuelven a verse todos.
- [x] CA-4: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Toggle `hideCompleted` en el detalle (junto al modo foco).
- [x] T-2: Filtrar `list.items` en el render según la preferencia.
- [x] T-3: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **Local, no sincronizada**: es una preferencia de visualización individual por dispositivo (como el modo foco); no afecta a otros colaboradores.