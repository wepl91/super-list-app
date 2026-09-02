# Modo foco a una sola mano (incluye mejor clickeabilidad de elementos)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Mejorar la UX en el flujo de compra en el teléfono: un **modo foco** por dispositivo que simplifica la interfaz del detalle de lista, agranda botones y casillas, agranda la **zona de tappeo** de los elementos (spec 8, integrado aquí) y brinda **respuesta háptica** (vibración) al completar/agregar elementos. Es una preferencia **local del dispositivo** (no se sincroniza).

Integra el spec "Elementos de una lista mejor clickeables": la fila completa (checkbox + label) es la superficie de tappeo para tachar un elemento, en lugar de solo el checkbox.

## Requisitos funcionales

- [x] RF-1: Un **toggle persistido por dispositivo** activa/desactiva el modo foco desde el detalle de una lista.
- [x] RF-2: En modo foco, la **fila completa** de cada elemento (checkbox + label) es clickeable para tachar, con casilla y controles **más grandes**.
- [x] RF-3: En modo foco, el formulario de alta se **simplifica** a nombre + botón grande (se ocultan descripción/cantidad/unidad).
- [x] RF-4: **Vibración** al completar un elemento y al agregar uno, solo en modo foco (feature-detection; iOS no vibra → no-op).
- [x] RF-5: En modo foco se oculta la descripción del elemento (UI más limpia); la cantidad se mantiene visible.
- [x] RF-6: Al salir del modo foco, la UI vuelve a la vista normal completa (incluye editar elementos con descripción/cantidad/unidad).

## Requisitos no funcionales

- RNF-1: La preferencia se guarda en `localStorage` (`super-list-preferences`), sin sincronización entre dispositivos.
- RNF-2: Preferencia compartida y reutilizable para futuros toggles locales (spec "Esconder elementos tachados" usa el mismo store).
- RNF-3: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-4: Sin dependencias nuevas; la vibración usa la API `navigator.vibrate` nativa.

## Diseño técnico

- **`src/lib/stores/preferencesStore.ts`**: store Zustand persistido (`super-list-preferences`) con `focusMode` (y `hideCompleted`, reutilizado por el spec de ocultar tachados). Accesores `setFocusMode`/`setHideCompleted`.
- **`src/lib/haptics.ts`**: `haptic(pattern?)` → `navigator.vibrate` con try/catch y feature-detection (no-op en iOS, donde Vibrate no existe).
- **`src/components/ListItemRow.tsx`**: nueva prop `focusMode?: boolean`. En foco: casilla `h-8 w-8`, label clickeable con `cursor-pointer`, texto `text-lg`, cantidad destacada, botones editar/eliminar más grandes (`p-3`, iconos `h-6 w-6`); la descripción solo se muestra fuera de foco. `handleToggle` llama `haptic()` en foco.
- **`src/app/lista/[id]/page.tsx`**: toggle de foco en el header (icono mano + `aria-pressed`), form simplificado en foco, y `haptic()` al agregar.

## Criterios de aceptación

- [x] CA-1: Activar el modo foco en una lista y navegar a otra la mantiene activo (persistido por dispositivo).
- [x] CA-2: En modo foco, tocar cualquier parte de la fila tacha el elemento (no solo el checkbox).
- [x] CA-3: Al completar/agregar en modo foco el dispositivo vibrúa (Android/Chrome); en iOS no rompe.
- [x] CA-4: Fuera de foco, la vista normal sigue funcionando sin cambios.
- [x] CA-5: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Crear `preferencesStore.ts` (focusMode + hideCompleted).
- [x] T-2: Crear `haptics.ts`.
- [x] T-3: Actualizar `ListItemRow` (prop `focusMode`, fila clickeable, controles grandes, háptica).
- [x] T-4: Actualizar `lista/[id]/page.tsx` (toggle, form simplificado, háptica en alta).
- [x] T-5: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **Integración spec 8**: la superficie grande de tappeo (checkbox + label) se activa **junto con el modo foco** (decisión; el spec 8 permitía incluirse). La fila clickeable existe siempre como label mejorado, pero el tamaño grande es del foco.
- **Háptica en iOS**: `navigator.vibrate` no existe en iOS Safari; `haptic()` es no-op silencioso. La app no se degrada.
- **Preferencia local**: no se sincroniza por diseño; cada dispositivo conserva su modo.