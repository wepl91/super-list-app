# Modales de confirmación con la UI de la app

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Reemplazar el `window.confirm()` nativo (y confirmar todas las acciones destructivas que hoy no piden confirmación) por **modales propios con la misma UI de la app**: fondo oscuro translúcido, tarjeta redondeada, mensaje claro en español y botones Cancelar/Confirmar accesibles. Puntos cubiertos:

- **Eliminar una lista** (`ListCard`). Reemplaza el `window.confirm` actual.
- **Eliminar un elemento** (`ListItemRow`). Hoy se elimina sin confirmar.
- **Eliminar elementos tachados** (`ListOptionsMenu`). Hoy se eliminan sin confirmar.

## Requisitos funcionales

- [x] RF-1: Un componente `ConfirmDialog` reutilizable (open, título, mensaje, labels, onConfirm/onCancel) con la UI de la app.
- [x] RF-2: Eliminar lista abre el modal en lugar de `window.confirm`; confirmar elimina la lista.
- [x] RF-3: Eliminar un elemento del detalle pide confirmación antes de borrarlo.
- [x] RF-4: "Eliminar completados" pide confirmación antes de borrar todos los tachados.
- [x] RF-5: Cierre con botón Cancelar, click fuera y tecla Escape.

## Requisitos no funcionales

- RNF-1: Accesible (role="dialog", aria-modal, autoFocus en el botón cancelar/confirmar, Escape cerrable).
- RNF-2: No bloquea la UI mientras está abierto (overlay + z alto), cierra con `finally`.
- RNF-3: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-4: Textos en español consistentes.

## Diseño técnico

- **`src/components/ConfirmDialog.tsx`**: client component con props `{ open, title, message, confirmLabel?, cancelLabel?, onConfirm, onCancel, destructive? }`. Renderiza un overlay `fixed inset-0` con `role="dialog" aria-modal="true"`, tarjeta centrada `rounded-2xl`, botones: Cancelar (contorno) y Confirmar (rojo si `destructive`). Maneja Escape y click fuera.
- **`ListCard`**: `handleDelete` cierra el menú y abre `deleteConfirm`; el modal confirma → `deleteList(list.id)`.
- **`ListItemRow`**: agrega `confirmOpen` + `ConfirmDialog`; el botón de eliminar abre el modal; confirmar → `deleteItem`.
- **`ListOptionsMenu`**: `handleDeleteCompleted` abre un `ConfirmDialog` local; confirmar → `onDeleteCompleted()`.

Estado controlado por los padres (sin store global) para mantener cada componente simple.

## Criterios de aceptación

- [x] CA-1: Eliminar lista muestra el modal propio (no el `window.confirm`).
- [x] CA-2: Cancelar / Escape / click fuera cierran sin borrar.
- [x] CA-3: Confirmar elimina (lista / elemento / tachados) según el caso.
- [x] CA-4: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Crear `ConfirmDialog`.
- [x] T-2: Aplicar en `ListCard` (eliminar lista).
- [x] T-3: Aplicar en `ListItemRow` (eliminar elemento).
- [x] T-4: Aplicar en `ListOptionsMenu` (eliminar completados).
- [x] T-5: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **Estado local en cada componente**: se eligió estado propio por componente (no un store global) por simplicidad y bajo acoplamiento; el diálogo es puramente presentacional.
- **window.confirm eliminado**: `ListCard` deja de usar la API nativa; la UI queda consistente con el resto de la app.