# UX del detalle de lista (layout, progreso y microinteracciones)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-03

## Contexto / Objetivo

El **detalle de lista** (`src/app/lista/[id]/page.tsx` y `src/components/ListItemRow.tsx`) es la pantalla más usada y donde se vive la experiencia de compra/tareas. Actualmente:

1. El **layout del elemento** mezcla nombre/cantidad/descripción en una fila; la cantidad queda separada del nombre y la descripción se trunca (spec draft `ui-elemento-lista-layout.md` ya identifica esto).
2. **No hay agrupación clara** entre elementos pendientes y completados.
3. El **resumen de progreso** (párrafo "X elementos · Y completados") es texto plano sin jerarquía visual.
4. Faltan **microinteracciones** al completar/eliminar en esta pantalla (complementa `ux-microinteracciones-globales`).

Este spec **integra y amplía** el draft `ui-elemento-lista-layout.md` y agrega mejoras propias del detalle. Consume primitivas de `ux-microinteracciones-globales` (motion, EmptyState, botones, háptica).

## Requisitos funcionales

- [x] RF-1: **Layout del elemento** (integra `ui-elemento-lista-layout.md`): la cantidad se muestra entre paréntesis a la derecha del nombre (`Nombre (cantidad)` / `Nombre (cantidad unidad)`); la descripción va **debajo** del nombre en hasta 2 líneas (`line-clamp-2`), sin truncar con `...`. Funciona en modo normal y foco.
- [x] RF-2: **Agrupación de elementos**: los elementos pendientes y los completados se separan visualmente (ej. los completados con marcador visual más tenue, o una subsección "Completados" colapsable) para reducir ruido.
- [x] RF-3: **Resumen de progreso visual**: se reemplaza/augmenta el párrafo "X · Y" por un elemento de progreso (contador + mini barra de progreso) que comunica cuánto falta, manteniendo el texto accesible.
- [x] RF-4: **Microinteracción de completado**: al tachar un elemento, la fila hace una transición/animación de "marcado" (tachado animado o fade hacia el grupo completado) y dispara `haptic()` (donde aplique) — complementa `ux-microinteracciones-globales`.
- [x] RF-5: **Microinteracción de eliminado**: al eliminar un elemento (o desde el menú "eliminar completados"), el elemento/lista hace fade-out antes de removerse.
- [x] RF-6: **Empty states del detalle** (usa `EmptyState`): "lista vacía" y "sin pendientes" usan el componente con icono y texto, en lugar de texto plano.
- [x] RF-7: **Modo foco**: se conserva y se adapta al nuevo layout (fila completa clickeable, controles grandes, cantidad visible, descripción oculta) — si `ui-elemento-lista-layout` lo requiere.

## Requisitos no funcionales

- RNF-1: **Accesibilidad**: `aria-label` del checkbox ("Completar <nombre>") se mantiene; agrupación/colapso de completados accesible por teclado; transiciones respetan reduced-motion.
- RNF-2: **Sin dependencias nuevas**: solo CSS/Tailwind + primitivas existentes.
- RNF-3: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-4: **Regla de proceso**: cambios en `ListItemRow`, `page.tsx` o nuevos componentes incluyen/actualizan tests; coverage ≥80% líneas / 75% ramas.
- RNF-5: Responsive mobile (320px+) y desktop; modo foco intacto.

## Diseño técnico

- **`src/components/ListItemRow.tsx`** (integra `ui-elemento-lista-layout.md`):
  - Layout del `<li>`: columna central con nombre+cantidad arriba y descripción debajo (`line-clamp-2`). `quantityLabel()` se integra en el span del nombre como ` ({quantity} {unit})`.
  - Micro-animación de completado: clase condicional / estado local con keyframes (p.ej. `row-pop` o tachado animado) usando tokens de `ux-microinteracciones-globales`, y `haptic()` ya presente.
  - Fade-out al eliminar: estado local `deleting` que aplica `opacity-0 transition-opacity` antes de llamar a `deleteItem`.
  - Mantener compatibilidad con `focusMode` y `isReadOnly` (el layout jerárquico se aplica en ambos).
- **`src/app/lista/[id]/page.tsx`**:
  - **Agrupación**: renderizar pendientes y completados en bloques separados; si hay completados y `hideCompleted` está off, subsección "Completados (n)" (opcional colapsable) accesible.
  - **Resumen de progreso**: componente pequeño `ProgressSummary` (contador + barra) reutilizable; se mantiene el texto accesible (`role` o `aria-label`).
  - **Empty states**: usar `EmptyState` para los dos casos vacíos.
- **`src/components/ProgressSummary.tsx`** (nuevo): props `total: number; completed: number`; muestra `x de y` + barra de progreso (`div` con ancho %), con `aria` accesible (p.ej. `role="progressbar"` con `aria-valuenow`). Incluye test.
- **Subsección colapsable**: puede ser un pequeño componente `Section`/`details` semántico o un toggle con `aria-expanded`, sin librería extra.

## Criterios de aceptación

- [x] CA-1: Dado un item "Leche" con cantidad 5 y sin unidad, cuando se renderiza, entonces se muestra `Leche (5)` con el nombre y la descripción debajo en ≤2 líneas.
- [x] CA-2: Dado un item con unidad (ej. "Arroz" 2 kg), cuando se renderiza, entonces se muestra `Arroz (2 kg)`.
- [x] CA-3: Dado un detalle con pendientes y completados, cuando se renderiza, entonces están separados en grupos visuales distintos (pendientes vs completados).
- [x] CA-4: Dado un detalle con items, cuando se renderiza, entonces el resumen de progreso muestra "x de y" (o equivalente) y la barra refleja el % completado; es accesible (`role/aria`).
- [x] CA-5: Dado un elemento, al tacharlo, entonces hace la micro-animación de marcado y dispara `haptic()` donde aplica; con reduced-motion no se anima.
- [x] CA-6: Dado un elemento a eliminar, cuando se elimina, entonces hace fade-out antes de desaparecer.
- [x] CA-7: Dados los estados vacíos de lista y sin-pendientes, cuando se renderizan, entonces usan `EmptyState` con icono y CTA adecuado.
- [x] CA-8: El `aria-label` del checkbox sigue siendo "Completar <nombre>".
- [x] CA-9: En modo foco el layout y los tamaños grandes se conservan con la nueva jerarquía.
- [x] CA-10: `npm run lint`, `tsc --noEmit`, `next build` y `npm test` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [x] T-1: Reaplicar/consolidar `ui-elemento-lista-layout.md` (nombre+cantidad a la derecha del nombre; descripción `line-clamp-2` debajo).
- [x] T-2: Agregar micro-animación de completado + fade-out de eliminado en `ListItemRow` + test.
- [x] T-3: Crear `ProgressSummary` + test (contador + barra, accesible).
- [x] T-4: Agrupar pendientes/completados en `page.tsx` (subsección completados colapsable accesible).
- [x] T-5: Aplicar `EmptyState` a los estados vacíos del detalle.
- [x] T-6: Verificar modo foco con el nuevo layout.
- [x] T-7: Verificar `npm run lint`, `tsc --noEmit`, `next build` y coverage.

## Notas / decisiones

- **Integra `ui-elemento-lista-layout.md`** (draft): este spec absorbe y amplía ese draft; al aprobarse, se marca `ui-elemento-lista-layout.md` como integrado/superseded para evitar specs duplicados.
- **Depende de ux-microinteracciones-globales**: usa `EmptyState`, motion tokens y háptica de ese spec; implementar en ese orden.
- **Agrupación de completados**: se mantiene respetando la preferencia `hideCompleted` existente en `preferencesStore`.
- **Colapso de completados**: opcional y accesible; si agrega complejidad se empieza por la separación visual simple.
