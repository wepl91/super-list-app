# UX del Home y la navegación

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-03

## Contexto / Objetivo

El **home** (`src/app/page.tsx`) y la **navegación entre pantallas** son funcionales pero planos: las `ListCard` no comunican su estado ni ofrecen jerarquía visual clara, los estados vacíos son texto simple, el drag & drop no tiene feedback de "hover" y la transición home ↔ detalle es un *hard cut*. Objetivo: mejorar la **percepción y jerarquía** del home, el feedback del drag & drop, los estados vacíos y la **transición de navegación**, de forma consistente y accesible.

Consume las primitivas del spec **ux-microinteracciones-globales** (`EmptyState`, tokens de motion, clases de botones). El orden de implementación recomendado: **primero** microinteracciones-globales, **luego** este spec.

## Requisitos funcionales

- [x] RF-1: **Empty states en el home**: cuando no hay listas, se muestra `EmptyState` (icono + título + descripción + CTA "Crear la primera lista") en lugar del texto plano actual; el CTA hace scroll/foco al input de creación.
- [x] RF-2: **Jerarquía visual de `ListCard`**: se diferencia visualmente "Mis listas" de "Compartidas conmigo" con un marcador (ej. icono de compartido, badge o tinte de superficie distinto), y la card muestra un resumen legible (nombre, cantidad de elementos, progreso de completados).
- [x] RF-3: **Feedback de drag & drop**: la card en arrastre se destaca (borde/sombra + escala leve), y al pasar sobre otra se indica el "drop target" de forma clara (línea/espaciado); al soltar, la card "vuelve" a su lugar con un pequeño snap.
- [x] RF-4: **Transición de navegación**: al navegar entre el home y el detalle de lista (y volver), se aplica una transición de entrada suave (fade + slide breve del contenido principal) respetando `prefers-reduced-motion`. No se interfiere con el render/los datos.
- [x] RF-5: **Header cohesionado**: en el home y el detalle, el header (título + avatar + tema + acciones) mantiene un espaciado y alineación consistente; los botones de acción del header tienen hover/active coherentes.
- [x] RF-6: **Feedback de creación**: al crear/duplicar una lista, la nueva card se resalta brevemente (flash/highlight) y el foco va hacia ella (o aparece animada).

## Requisitos no funcionales

- RNF-1: **Accesibilidad**: drag & drop sigue siendo operativo por teclado donde aplica (las manos de reordenar se mantienen); `aria-label` de cards se conservan; las transiciones respetan reduced-motion.
- RNF-2: **Rendimiento**: animaciones solo de transform/opacity; sin plugins nuevos.
- RNF-3: **Sin dependencias nuevas**: se reutilizan `@dnd-kit` ya presente y utilidades de `ux-microinteracciones-globales`.
- RNF-4: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-5: **Regla de proceso**: cambios en `ListCard`, `page.tsx` o nuevo componente de transición incluyen/actualizan tests; coverage ≥80% líneas / 75% ramas.
- RNF-6: Responsive mobile (320px+) y desktop; el drag en touch funciona.

## Diseño técnico

- **Componente principal**: `src/app/page.tsx` (home) y `src/components/ListCard.tsx`.
- **`EmptyState`**: reutilizado de `ux-microinteracciones-globales` para el caso "sin listas". El CTA que crea la lista enfoca el input `#new-list-name`.
- **`ListCard.tsx`**:
  - **Drag feedback**: usar las props que ya expone `useSortable` (`isDragging`, `transform`, `transition`, `isOver`) para: elevar la card activa (`shadow-lg`, `scale-[1.02]`, `ring`), dar sombra/espaciado al target (`isOver`), y snap de retorno ya provisto por `CSS.Transform.toString` + `transition`.
  - **Badge de compartida**: cuando `role === "editor"` (o `sharedMembers.length > 0` en owner), mostrar un chip "Compartida" con icono (del set de `migracion-iconos-lucide`).
  - **Progreso**: barra o contador de completados en la card (ej. `n/m completados` con mini barra de progreso opcional).
- **Transición de página** (`src/app/page.tsx` y `src/app/lista/[id]/page.tsx`):
  - Opción A (recomendada, MVP): un hook/componente `PageTransition` que aplica una clase de entrada (fade+slide) al contenedor principal al montar, usando los tokens de motion de `globals.css`. Simple, sin cambiar el sistema de navegación.
  - Opción B (avanzada): transición de vista con `View Transitions API` si está disponible, con fallback a la Opción A. Decidir en implementación; se prioriza **A** por simplicidad y bajo riesgo.
- **Highlight de creación**: en `page.tsx`, al crear/duplicar, marcar temporalmente el id de la card recién creada para aplicarle una animación "flash" (clase CSS) ~600ms.

## Criterios de aceptación

- [x] CA-1: Dado el home sin listas, cuando se renderiza, entonces se muestra `EmptyState` con icono, título, descripción y CTA que enfoca el input de creación.
- [x] CA-2: Dadas listas propias y compartidas, cuando se renderiza el home, entonces las compartidas se distinguen visualmente (badge/chip) y la card muestra el progreso de completados.
- [x] CA-3: Dado el home editable, al arrastrar una card, entonces la card activa se eleva y el target se indica; al soltar la card hace snap a su nueva posición.
- [x] CA-4: Dado el home, al crear/duplicar una lista, entonces la nueva card se destaca brevemente (flash/highlight).
- [x] CA-5: Dada la navegación home→detalle→home, cuando cambia la ruta, entonces el contenido entra con una transición suave (fade+slide); con `prefers-reduced-motion` no se anima.
- [x] CA-6: `npm run lint`, `tsc --noEmit`, `next build` y `npm test` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [x] T-1: Usar `EmptyState` para el home sin listas con CTA que enfoca el input.
- [x] T-2: Mejorar `ListCard` (highlight card, badge compartida, progreso) + test.
- [x] T-3: Agregar feedback de drag & drop (`isDragging`/`isOver`/scale/shadow/snap) en `ListCard` + test.
- [x] T-4: Añadir transición de entrada de página (Opción A) en home y detalle respetando reduced-motion.
- [x] T-5: Agregar highlight/flash al crear/duplicar lista + test.
- [x] T-6: Unificar header home/detalle (alineación, hover/active).
- [x] T-7: Verificar `npm run lint`, `tsc --noEmit`, `next build` y coverage.

## Notas / decisiones

- **Depende de ux-microinteracciones-globales**: usa `EmptyState`, tokens de motion y clases de botones de ese spec; implementar en ese orden.
- **Transición simple (Opción A) por defecto**: se prioriza una transición de entrada de bajo riesgo sobre un sistema complejo; se evalúa View Transitions solo si aporta valor claro y sin riesgo.
- **Drag & drop**: solo feedback visual, no cambia la lógica de reordenamiento existente en `listStore`.
