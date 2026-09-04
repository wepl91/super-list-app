# UI del elemento de lista — Layout de nombre, cantidad y descripción

**Estado**: `draft`
**Versión**: v1
**Fecha**: 2026-09-03

> **Nota**: este spec fue **integrado/superseded** por `ux-detalle-lista-visual.md` (RF-1 y diseño técnico lo absorben). Se mantiene como referencia del detalle de layout.

## Contexto / Objetivo

El layout actual del componente `ListItemRow` muestra el nombre, la descripción y la cantidad en una fila horizontal simple. Esto causa dos problemas de UX:

1. **La cantidad queda separada del nombre**, difícil de asociar visualmente (está al final de la fila, después de la descripción).
2. **La descripción se trunca con `truncate`**, lo que hace que textos largos se corten con "..." y el usuario no pueda leer la información completa.

Se propone reorganizar el layout para:
- Colocar la cantidad entre paréntesis a la derecha del nombre (ej: `Leche (5)`).
- Mostrar la descripción debajo del nombre en un bloque de hasta 2 líneas, evitando desbordes del contenedor.

## Requisitos funcionales

- [ ] RF-1: La cantidad se muestra entre paréntesis a la derecha del nombre del elemento (formato: `Nombre (cantidad)`).
- [ ] RF-2: Si el item tiene unidad, se muestra como `Nombre (cantidad unidad)` (ej: `Leche (2 l)`).
- [ ] RF-3: La descripción se renderiza **debajo** del nombre, en un bloque limitado a 2 líneas (`line-clamp-2`) sin `truncate`.
- [ ] RF-4: El layout mantiene la legibilidad tanto en modo normal como en modo foco.
- [ ] RF-5: No se rompe la funcionalidad existente (checkbox, editar, eliminar, modo solo lectura).

## Requisitos no funcionales

- RNF-1: Sin dependencias nuevas; solo cambios de CSS/Tailwind en `ListItemRow.tsx`.
- RNF-2: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-3: Accesibilidad: el `aria-label` del checkbox sigue incluyendo el nombre del item.
- RNF-4: Responsive: funciona en mobile (320px+) y desktop.

## Diseño técnico

- **Componente afectado**: `src/components/ListItemRow.tsx`.
- **Cambio de layout**: el `<li>` cambia de `flex items-center` a un layout con区域內容:
  - Zona izquierda: checkbox (se mantiene igual).
  - Zona central: columna vertical con nombre+cantidad y descripción debajo.
  - Zona derecha: botones de acción (se mantiene igual).
- **Nombre + cantidad**: un solo `<span>` con el nombre seguido de ` (cantidad)` o ` (cantidad unidad)`. Se modifica `quantityLabel` o se integra directamente en el render.
- **Descripción**: cambia de `<p className="truncate">` a `<p className="line-clamp-2">` y se posiciona debajo del nombre dentro de la zona central.
- **Modo foco**: se mantiene la misma lógica de tamaños grandes (`text-lg`, `p-4`), pero con el nuevo layout.

### Estructura del layout propuesto

```
┌─ li ────────────────────────────────────────────┐
│  [checkbox]  [Nombre (cant)]     [✏️] [🗑️]      │
│              [descripción...  ]                  │
│              [descripción2..]                    │
└─────────────────────────────────────────────────┘
```

## Criterios de aceptación

- [ ] CA-1: Dado un item "Leche" con cantidad 5 y sin unidad, cuando se renderiza, entonces se muestra `Leche (5)` en una línea con el nombre.
- [ ] CA-2: Dado un item "Arroz" con cantidad 2 y unidad "kg", cuando se renderiza, entonces se muestra `Arroz (2 kg)`.
- [ ] CA-3: Dado un item con descripción larga (>50 chars), cuando se renderiza, entonces la descripción se muestra en máximo 2 líneas sin desbordar el contenedor.
- [ ] CA-4: Dado un item en modo foco, cuando se renderiza, entonces el layout mantiene la jerarquía nombre+cantidad arriba y descripción abajo, con tamaños de fuente grandes.
- [ ] CA-5: El checkbox sigue teniendo `aria-label` correcto ("Completar Leche").
- [ ] CA-6: `npm run lint`, `tsc --noEmit` y `next build` pasan sin errores.

## Tareas de implementación (derivadas)

- [ ] T-1: Reemplazar `truncate` por `line-clamp-2` en el `<p>` de descripción.
- [ ] T-2: Mover la lógica de cantidad al `<span>` del nombre (formato `Nombre (cant)` o `Nombre (cant unidad)`).
- [ ] T-3: Ajustar el layout del `<li>` para que nombre+cantidad y descripción estén en una columna vertical al lado del checkbox.
- [ ] T-4: Verificar que modo foco y modo solo lectura funcionan correctamente con el nuevo layout.
- [ ] T-5: Ejecutar `npm run lint`, `tsc --noEmit`, `npm run build` y `npm test`.

## Notas / decisiones

- **`line-clamp-2` es soportado nativamente por Tailwind** (v3+), no requiere plugin.
- **La función `quantityLabel`** puede reutilizarse o integrarse directamente en el template JSX para simplificar.
- **No se modifica el modo edición** (el form de editar se mantiene igual).
- **Formato de cantidad**: se decide usar paréntesis `(cant)` en lugar de guion `— cant` para mayor claridad visual.
