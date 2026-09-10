# Gestos táctiles en el detalle de lista (swipe, long-press/reordenar, fijar y filtros)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-09

> **Alcance final (decisión del dueño tras QA, 2026-09-09)**: se **descartaron** el drag & drop de items (long-press, `ListItemSortable`, `itemsOrder.ts` y la sección "Fijados") y el **fijar** (botón pin). El pin no operaba de forma fiable sobre la fila y el drag agregaba fricción sin valor percibido; el reorden de items queda **solo alfabético** (`sortItems`). **Se mantienen**: swipe para completar/desmarcar (RF-1), chips de filtro (RF-5) y su convivencia con el modo foco y `hideCompleted`. La limpieza (código, tests, migración `pinned`, `schema.sql` y tipos) quedó hecha en la misma entrega.

## Contexto / Objetivo

El **detalle de lista** (`src/app/lista/[id]/page.tsx`, `src/components/ListItemRow.tsx`) es la pantalla más usada del flujo de compra. Hoy:

1. **No hay gestos táctiles**: tachar/desmarcar se hace solo con el checkbox (o la fila clickeable en modo foco, `modo-foco-una-mano`).
2. **No hay reordenamiento granular de items**: a diferencia del home (que usa drag & drop con `@dnd-kit` sobre `ListCard`), el único orden disponible es `sortItems` alfabético desde `ListOptionsMenu`. **Verificado**: `ListItemRow` no tiene botones up/down ni arrastre; `sortItems` es la única mutación de `position` de items existente en `listStore`.
3. No existe el concepto de "fijar" items ni de **filtrar** el detalle por estado (solo el toggle global `hideCompleted` por dispositivo).

Objetivo: gestos táctiles móviles (swipe para completar/desmarcar, long-press + drag para reordenar), **fijar** items arriba, y **filtros** por estado ("todo / pendientes / tachado"). Reutiliza `@dnd-kit` (ya en el stack, usado en el home) y APIs nativas (Pointer Events): **sin dependencias nuevas**.

## Requisitos funcionales

- [x] RF-1: **Swipe para completar/desmarcar**: deslizar una fila pendiente hacia la derecha la tacha (completa); deslizar una fila completada hacia la izquierda la desmarca. En `isReadOnly` (sin sesión) los gestos de escritura no producen cambios.
- [x] RF-2: **Long-press + drag para reordenar**: mantener presionada una fila (o su handle) y arrastrar reordena los items; el nuevo orden persiste (`position`) y se sincroniza (mismo patrón de push por item que `sortItems`).
- [x] RF-3: **Fijar items**: un control por fila (botón pin) fija/desfija el item. Los fijados se muestran en una sección "Fijados" al tope del detalle, siempre visibles (aunque estén tachados y aunque el filtro los excluya del grupo natural).
- [x] RF-4: Quitar el pin devuelve el item a su grupo natural (pendientes/completados) y posición previa dentro de él.
- [x] RF-5: **Filtros del detalle**: chips/segmented "Todo / Pendientes / Tachados" sobre el listado. "Pendientes" oculta completados; "Tachados" oculta pendientes; "Todo" (default) muestra todos.
- [x] RF-6: Los gestos y controles conviven con el **modo foco**: swipe igual funciona; el drag usa un handle grande (`GripVertical`) para no chocar con la fila clickeable; la sección "Fijados" y los chips se renderizan con tamaños de foco.
- [x] RF-7: **Accesible**: el swipe tiene alternativa por teclado (checkbox/label existentes); el reorden tiene `KeyboardSensor` de dnd-kit (flechas); pin y chips con `aria-pressed`/`aria-label`.
- [x] RF-8: El **estado del filtro es por dispositivo y por sesión de navegación** (no se persiste ni sincroniza); la **fijación es data de la lista** (`pinned` en `ListItem`) y se sincroniza con el resto de colaboradores.
- [x] RF-9: Los items fijados conviven con la agrupación existente (secciones "Pendientes"/"Completados", `ProgressSummary`, `EmptyState`) y con `hideCompleted` (si está activo, "Tachados"/"Todo" respetan la preferencia de ocultar completados fuera de la sección fijada).

## Requisitos no funcionales

- RNF-1: **Sin dependencias nuevas**: gestos con Pointer Events nativos (mismo modelo de eventos que ListCard); drag con `@dnd-kit/core` + `@dnd-kit/sortable` (ya instalados, v6/v10 en `package.json`).
- RNF-2: **Accesibilidad**: targets táctiles ≥ 44px en modo foco; roles y `aria-label` en español; transiciones de swipe/arrastre respetan `prefers-reduced-motion`.
- RNF-3: **PWA/offline**: el arrastre y la fijación mutan el store local primero y se propagan best-effort (patrón `pushItemToRemote` con `ItemsMutation`); sin sesión quedan como `local`.
- RNF-4: No interfiere con el scroll vertical (el swipe exige dominancia horizontal; el long-press exige delay).
- RNF-5: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas (regla de `AGENTS.md`).

## Reglas de UX/UI

- **Swipe**: umbral de desplazamiento horizontal ~64px con heurística `|dx| > |dy|`; feedback en vivo (la fila acompaña el dedo con `transform`), al soltar por encima del umbral se ejecuta la acción con la microinteracción existente (`animate-row-pop` + `haptic()` en foco, de `ux-detalle-lista-visual`/`modo-foco-una-mano`); con reduced-motion, acción directa sin desplazamiento visuulado.
- **Long-press**: indicador de "elevación" de la fila (sombra/escala, patrón `ListCard` cuando `isDragging`); el `PointerSensor` usa `activationConstraint: { delay: ~400ms, tolerance: 8px }` para no competir con el clic/toggle ni con el swipe.
- **Fijados**: sección "Fijados (n)" al tope, con separador claro; el pin se ve activo (`aria-pressed`, icono `PinOff` al desfijar). Propuesta de alcance v1: fijar ordena por posición dentro de la sección (el drag sigue operando dentro de ella); la mezcla de "fijado arriba + orden fino entre fijados" se valida con el dueño.
- **Chips de filtro**: grupo de 3 botones tipo segmented (patrón toggle de foco/`aria-pressed`), ubicado entre el header y `ProgressSummary`; textos "Todo / Pendientes / Tachados" (copy "tachados" alineado con `ListOptionsMenu`).

## Diseño técnico

### Modelo y sync

- **`src/lib/types.ts`**: `ListItem.pinned?: boolean` (default `false`).
- **`src/lib/stores/listStore.ts`**:
  - `makeItem` setea `pinned: false`.
  - `togglePin(listId, itemId)` (bump + push por item, patrón `toggleItem`).
  - `reorderItems(listId, activeId, overId)`: reordena items **dentro de su grupo natural** (pendientes o completados) y reasigna `position`; bump + push de los afectados (patrón `sortItems`). La lógica de reorden puro se delega en `src/lib/itemsOrder.ts` para testearla sin store.
  - `updateItem` conserva `pinned` al editar nombre/cantidad.
- **Migración SQL** `supabase/migrations/<timestamp>_list_items_pinned.sql` (idempotente, patrón del repo): `alter table public.list_items add column if not exists pinned boolean not null default false;` + actualizar `supabase/schema.sql` (snapshot).
- **`src/lib/sync/db.ts`**: `ListItemRow.pinned` + mapeo en `toListItem`/`toListItems`. `service.ts` no cambia: `applyItemsMutation` ya hace upsert del item completo (pinned viaja en el payload). Realtime (`useListItemsRealtime`) propaga `pinned`/`position` a los colaboradores sin cambios.

### Gestos y reorden

- **`src/lib/gestures.ts`** (nuevo, lógica pura): `detectSwipe(dx, dy, threshold = 64): "left" | "right" | null` (exige `|dx| > |dy|`); testeable sin DOM.
- **`src/hooks/useItemSwipe.ts`** (nuevo, client): Pointer Events sobre la fila; expone `{ offsetX, gestureStart... }`, `onComplete()/onUncomplete()` y `disabled` para `isReadOnly`; haptics en foco; cleanup de listeners.
- **`src/lib/itemsOrder.ts`** (nuevo, puro): `reorderItems(items, activeId, overId): ListItem[]` (reordena dentro del grupo que comparte `completed`) y `splitPinned(items): { pinned: ListItem[]; rest: ListItem[] }`; `applyTogglePin(items, id)`.
- **`src/components/ListItemRow.tsx`**: integra el swipe (feedback + acción), el botón pin (`Pin`/`PinOff` de lucide, verificar export en la versión instalada; `GripVertical` ya se usa en `ListCard`) y, si el reorden es por fila, la envoltura con `useSortable`. Para no acoplar gestos con sortable se prefiere un wrapper (siguiente punto).
- **`src/components/ListItemSortable.tsx`** (nuevo): wrapper `useSortable` (con `PointerSensor` inyectado en la página, `delay` long-press) que renderiza `ListItemRow` y aplica `transform`/`transition` de dnd-kit; `disabled` para `isReadOnly`. Mantiene `ListItemRow` testable sin dnd-kit.
- **`src/app/lista/[id]/page.tsx`**:
  - `DndContext` (patrón del home) con `PointerSensor` (delay long-press) + `KeyboardSensor` (`sortableKeyboardCoordinates`); `SortableContext` con `verticalListSortingStrategy` por sección (pendientes/completados y fijados).
  - Estado `filter: "all" | "pending" | "done"` local de la página (no persistido).
  - Render: sección "Fijados" (si hay `pinned`), luego "Pendientes"/"Completados" filtradas según `filter` y `hideCompleted`; `ProgressSummary` y `EmptyState` intactos.
- **`src/components/ListFilterChips.tsx`** (nuevo): props `{ filter, onChange }`; 3 botones con `role="group"` + `aria-label="Filtrar elementos"` y `aria-pressed` por activo; variante foco más grande.
- **`vitest.config.ts`**: agregar al `include` de coverage: `src/lib/gestures.ts`, `src/lib/itemsOrder.ts`, `src/hooks/useItemSwipe.ts`, `src/components/ListItemSortable.tsx`, `src/components/ListFilterChips.tsx`, y (decisión) `src/components/ListItemRow.tsx` — hoy testada pero fuera del include; con la lógica de gestos/pin conviene que pase a medirse (ver Notas).

## Cobertura de tests

- `src/lib/gestures.test.ts` (puro): umbral, dominancia horizontal, direcciones.
- `src/lib/itemsOrder.test.ts` (puro): reorden dentro del grupo, llamado fuera de grupo no-op, `splitPinned`, `applyTogglePin`.
- `src/hooks/useItemSwipe.test.tsx`: pointerDown/move/up y transiciones a `onComplete`/`onUncomplete`; cancelación por vertical; `disabled` en read-only.
- `src/components/ListItemSortable.test.tsx`: mock de `useSortable` (patrón `ListCard.test.tsx`); drag end reordena.
- `src/components/ListFilterChips.test.tsx`: estados por `aria-pressed`, cambio de filtro, variante foco.
- `src/components/ListItemRow.test.tsx` (extender): swipe dispara `toggleItem`; botón pin alterna `togglePin` y `aria-pressed`; pin visible solo con sesión (no `isReadOnly`).
- `src/app/lista/[id]/page.test.tsx` (smoke, la página sigue **fuera** del coverage): chips filtran la lista renderizada; switch de filtro persiste al re-render.
- Verificar thresholds globales 80/75 tras agregar archivos.

## Criterios de aceptación

- [x] CA-1: Dado un item pendiente, cuando swipes a la derecha, entonces se completa (y viceversa con swipe a la izquierda en un completado); en read-only no cambia nada.
- [x] CA-2: Dado un detalle con pendientes y completados, cuando arrastras un item a otra posición del mismo grupo, entonces el nuevo orden queda persistido (`position`) y, con sesión, se propaga por sync.
- [x] CA-3: Dado un item, al fijarlo, entonces pasa a la sección "Fijados" al tope (visible aunque el filtro seleccionado lo ocultaría); al desfijar vuelve a su grupo.
- [x] CA-4: Dados los chips de filtro, cuando selecciono "Pendientes" o "Tachados", entonces el listado se filtra; "Todo" (default) los muestra a todos.
- [x] CA-5: En modo foco, la fila completa sigue clickeable para tachar sin conflicto con el long-press del drag (el handle es el área de arrastre).
- [x] CA-6: Dado el foco en la lista, cuando uso teclado (flechas del `KeyboardSensor` y Espacio en el checkbox), entonces reordeno y completo items (alternativa accesible al gesto).
- [x] CA-7: El estado del filtro no se persiste entre recargas; la fijación sí (por-lista, sincronizada).
- [x] CA-8: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [x] T-1: Migración SQL (`pinned` en `list_items`) + snapshot `schema.sql`.
- [x] T-2: Tipos (`pinned`) + `db.ts` mappers.
- [x] T-3: `gestures.ts` + `itemsOrder.ts` (puros) con tests.
- [x] T-4: `useItemSwipe.ts` + test.
- [x] T-5: `listStore`: `togglePin`, `reorderItems` (delegando en `itemsOrder`), `makeItem`/`updateItem` con `pinned` (sin cubrir el store en coverage; la lógica vive en los helpers puros).
- [x] T-6: `ListItemRow` (swipe + pin) + `ListItemSortable` + tests.
- [x] T-7: `ListFilterChips` + integración en `page.tsx` (DndContext/sensores, sección Fijados, filtro local) + extend smoke test.
- [x] T-8: `vitest.config.ts` (include) + verificación `npm test`/`lint`/`tsc`/`build`.

## Notas / decisiones

- **Contexto corregido**: el reorden de items **no existe hoy** como drag ni como botones up/down (se verificó `ListItemRow.tsx` y `listStore.ts`; solo `sortItems` alfabético). Este spec agrega la capacidad por primera vez, reusando `@dnd-kit` (decisión acorde a `home-de-listas.md`, que ya eligió dnd-kit para el reorden).
- **Dirección del swipe**: se propone derecha = completar, izquierda = desmarcar (convención iOS de listas). Validar con el dueño si prefiere invertir; la lógica queda parametrizable en `detectSwipe`/`useItemSwipe`.
- **Filtros vs `hideCompleted`**: los chips son una vista temporal por dispositivo (estado local de la página, RF-8); `hideCompleted` sigue siendo la preferencia persistida del dispositivo (`preferencesStore`, `esconder-tachados.md`). Ambas conviven: el filtro opera sobre lo que `hideCompleted` no oculta.
- **Fijado es data de la lista** (se sincroniza), no preferencia local: compartir una lista implica que el orden/pines importan a ambos (p. ej. la pareja fija "Leche" en el super). El filtro, en cambio, es de visualización individual.
- **Colisión con Spec D (precios)**: ambos tocan `ListItemRow.handleToggle`/`listStore`. Si D se implementa después de A, el swipe (A) y el diálogo de precio (D) se integran sin reescribir el toggle dos veces. **Orden recomendado: C → A → B → D** para todo el set.
- **Coverage**: `listStore` permanece fuera del include (server actions/sync); por eso la lógica de reorden/pin se extrae a helpers puros que sí entran. `ListItemRow.tsx` pasa de "testeado sin medir" a medido (ganancia neta de coverage); si los thresholds 80/75 se complicaran, se evaluará revertir esa inclusión y cubrir con el smoke de página.

## Decisiones de implementación

- **`useItemSwipe` no expone `ref`**: los listeners de gesto viven en `window` (no se pierde el track si el dedo sale del nodo) y el inicio se captura con `onPointerDown` sobre la raíz. La fila no necesita un ref propio; el estado `offsetX`/`swiping` alimenta el `transform` en vivo.
- **Tipado del drag**: `SyntheticListenerMap` no se exporta públicamente en `@dnd-kit/sortable@10`; `ListItemDrag.listeners` se tipa `Record<string, unknown>` (compatible y propagable a la fila).
- **`ListItemSortable` desactiva la edición en read-only** (`editing && !isReadOnly`), coherente con la página.
- **Swipe ignora el handle y los controles**: el `ignore` del hook usa `closest("button, input, [data-drag-handle]")`, así el long-press del drag y el checkbox no compiten con el gesto.
- **`reorderItems` (store)** publica todos los items del grupo reordenado (patrón `sortItems`); el reordeno lógico vive en `itemsOrder.reorderItems`, que reasigna `position` 0..n-1 y es no-op cruzando grupos.
- **`applyTogglePin`** togglea `pinned` y actualiza `updatedAt` (la fijación viaja en el upsert completo del item; Realtime la propaga).
- **Chips entre header y `ProgressSummary`**, con copia "Tachados" alineada a `ListOptionsMenu`.
- **Verificación**: 196 tests; `npm run lint`, `tsc --noEmit` y `next build` verdes. Coverage global **90.46% stmts / 84.13% branch / 88.15% funcs / 92.63% lines**. `ListItemRow.tsx` queda medido al ~63% stmts / 71.9% branch (el editor inline y el flujo de eliminar con timeout no se ejercitan en sus tests); no condiciona los globales.