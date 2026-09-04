# Microinteracciones globales y pulido visual base

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-03

## Contexto / Objetivo

La app funciona bien pero la interacción se siente "plana": las acciones no tienen **feedback visual** más allá del cambio de estado, no hay **transiciones** entre pantallas, los **estados vacíos** son texto plano y el **foco de teclado** es inconsistente entre componentes. El objetivo de este spec es establecer una **capa global de microinteracciones** y un **sistema visual cohesivo** (transiciones, animaciones, foco, empty states, feedback táctil sensible) que se apliquen de manera consistente en toda la app, sin romper accesibilidad ni rendimiento.

Es el primero de tres specs de UX/UI. Este se enfoca en la **base global** reutilizable; los specs de *home/navegación* y *detalle de lista* consumen estas primitivas.

## Requisitos funcionales

- [x] RF-1: **Feedback táctil consistente**: al completar un elemento, agregar uno o eliminar uno, se dispara `haptic()` (vibración corta, solo donde ya existe), y se aplica una **micro-animación** de confirmación visual (ej: la fila "se sacude" o el checkbox "rebota" brevemente al tacharse).
- [x] RF-2: **Transiciones de entrada/salida**: los menús, modales (reusar `ConfirmDialog`), tooltips y paneles que aparecen/desaparecen usan una transición consistente (fade + slide corto, ~150-200ms) con `prefers-reduced-motion` respetado.
- [x] RF-3: **Estados vacíos visuales** (no solo texto): se crea un componente `EmptyState` reutilizable (icono + título + descripción + acción opcional) usado en: home sin listas, detalle de lista vacío, y lista sin pendientes.
- [x] RF-4: **Focus rings globales**: todos los elementos interactivos (botones, links, inputs, checkboxes, menú items) muestran un anillo de foco visible y consistente (`focus-visible:ring-2 ring-primary`), unificando lo que hoy es `focus:outline-none` en algunos y anillo en otros.
- [x] RF-5: **Botones**: se estandarizan los estilos base (primario, secundario/outline, fantasma/destructivo) como clases reutilizables, con estados `hover`, `active` (escala/press) y `disabled`.
- [x] RF-6: **Feedback de acción destructiva**: al pasar/activar acciones destructivas (eliminar) en botones, el icono y color indican peligro de forma consistente en toda la app.
- [x] RF-7: **Respeto de `prefers-reduced-motion`**: cualquier animación/transición nueva se desactiva (o se reduce a fade simple) cuando el usuario pide menos movimiento.

## Requisitos no funcionales

- RNF-1: **Accesibilidad**: mantener `aria-*`, `role`, foco y `sr-only`; no degradar lectores de pantalla; las animaciones no bloquean la operación.
- RNF-2: **Rendimiento**: usar solo animaciones de transform/opacity (GPU), sin plugins de animación nuevos; preferir CSS/Tailwind.
- RNF-3: **Sin dependencias nuevas**: nada más allá de Tailwind v4 nativo y utilidades ya presentes.
- RNF-4: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-5: **Regla de proceso**: cada componente/pieza nueva (o con nueva lógica) incluye tests automáticos; el coverage global se mantiene ≥80% líneas / 75% ramas.
- RNF-6: Responsive: funciona en mobile (320px+) y desktop.

## Diseño técnico

- **Nuevo `src/lib/motion.ts`** (o utilidades CSS en globals): helpers para detectar `prefers-reduced-motion` (media query) y un mapa de duraciones/easings centralizados (`--duration-fast: 150ms`, `--ease`).
- **Nuevo `src/components/EmptyState.tsx`**: props `icon?: ReactNode`, `title: string`, `description?: string`, `action?: ReactNode`, `className?`. Se renderiza con layout centrado, `role` semántico y accesible.
- **`src/app/globals.css`**: agregar `@keyframes` para las microinteracciones (ej. `row-pop`, `shake`, `fade-in`, `slide-up`) y utilidades `@utility` en Tailwind v4 si es necesario; reglas `@media (prefers-reduced-motion: reduce)` que anulen animaciones.
- **Componentes a tocar** (unificar foco/transiciones):
  - `src/components/ListItemRow.tsx` — animación de completado + haptic, focus ring del checkbox/fila.
  - `src/components/ConfirmDialog.tsx` — transición de entrada/salida fade+slide; focus al destino al abrir/cerrar.
  - `src/components/ListOptionsMenu.tsx` y menús de `ListCard.tsx` / `UserMenu.tsx` — transición de aparición, focus ring de items.
  - `src/components/ListCard.tsx` — estados hover/active, focus ring.
  - Botones primarios en `src/app/page.tsx` y `src/app/lista/[id]/page.tsx` — clase base estandarizada.
- **`src/lib/haptics.ts`**: ya existe; se reutiliza. Opcional: añadir patrones/variantes tipadas (`haptic("success") | haptic("delete") | haptic("focus")`) manteniendo compatibilidad con `haptic()` sin args.

### Sistema de botones propuesto (clases utilitarias en globals o un archivo de estilos)

- `btn-base`: `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70`
- `btn-primary`: `bg-primary text-white hover:opacity-90`
- `btn-outline`: `border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800`
- `btn-ghost`: `text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800`
- `btn-destructive`: `text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950`

## Criterios de aceptación

- [x] CA-1: Dado un elemento pendiente, cuando se tacha, entonces la fila dispara `haptic()` (donde aplica) y muestra una micro-animación breve de confirmación; con `prefers-reduced-motion` no se anima.
- [x] CA-2: Dado un `ConfirmDialog` abierto, cuando se abre/cierra, entonces hace una transición fade+slide ≤200ms y mantiene el foco accesible; con reduced-motion se muestra/oculta sin animar.
- [x] CA-3: Dado el home sin listas, el detalle vacío y el detalle sin pendientes, cuando se renderizan el estado vacío, entonces se usa `EmptyState` con icono, título y descripción.
- [x] CA-4: Dado cualquier elemento interactivo enfocado por teclado, cuando se presiona Tab, entonces se ve un anillo de foco visible y consistente (`ring-primary`).
- [x] CA-5: Dado un botón primario/outline/ghost/destructivo, cuando se renderiza, entonces tiene la clase base estandarizada con estados hover/active/disabled correctos.
- [x] CA-6: Dado `prefers-reduced-motion: reduce`, cuando hay microinteracciones, entonces no se animan (se aplican sin transición o con fade mínimo).
- [x] CA-7: `npm run lint`, `tsc --noEmit`, `next build` y `npm test` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [ ] T-1: Crear `src/components/EmptyState.tsx` + su test.
- [ ] T-2: Extender `src/lib/haptics.ts` con patrones tipados (manteniendo compatibilidad) + test.
- [ ] T-3: Agregar tokens de motion y utilidades de botones/animaciones en `globals.css` con soporte reduced-motion.
- [ ] T-4: Aplicar micro-animación de completado + focus ring en `ListItemRow.tsx` + test.
- [ ] T-5: Añadir transición de entrada/salida a `ConfirmDialog.tsx` + test.
- [ ] T-6: Unificar focus rings y aparición de menús (`ListOptionsMenu`, `ListCard`, `UserMenu`) + tests.
- [ ] T-7: Migrar botones a las clases base (`btn-primary`, etc.) en `page.tsx`, `lista/[id]/page.tsx` y componentes.
- [ ] T-8: Aplicar `EmptyState` en home y detalle vacíos.
- [ ] T-9: Verificar `npm run lint`, `tsc --noEmit`, `next build` y coverage.

## Notas / decisiones

- **Reduced motion es obligatorio**: cada animación nueva respeta `prefers-reduced-motion`. Es criterio de aceptación y no negociable por accesibilidad.
- **Sin librería de animación**: se usa CSS/Tailwind nativo para mantener bundle bajo y evitar dependencias (RNF-3).
- **Este spec es la base global**: los specs de home/navegación y detalle de lista reutilizan `EmptyState`, los tokens de motion y las clases de botones.
- **Háptica**: se reutiliza `src/lib/haptics.ts` existente; no se añade vibración donde el producto no la tenía para no degradar UX.
