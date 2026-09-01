# Fix: Input de cantidades decimales

**Estado**: `approved`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

El input de cantidad para añadir y editar elementos en una lista no permite ingresar números con decimales (ej: 0.5 kg, 1.25 l) y tampoco permite valores menores a 1. Esto es un problema para casos de uso como comprar media kilogramo de fruta o 1.5 litros de leche. El usuario necesita poder cargar cantidades fraccionarias.

## Requisitos funcionales

- [ ] RF-1: El usuario puede ingresar cantidades decimales en el input de cantidad (ej: 0.5, 1.25, 2.5).
- [ ] RF-2: El usuario puede ingresar el valor 0 como cantidad.
- [ ] RF-3: El input de cantidad debe aceptar valores numéricos positivos (>= 0) con hasta 2 decimales.
- [ ] RF-4: La cantidad se muestra correctamente en la vista del elemento (respetando formato decimal).

## Requisitos no funcionales

- RNF-1: El input debe ser accesible y funcionar correctamente en mobile (teclado numérico).
- RNF-2: No se deben romper elementos existentes con cantidades enteras.

## Diseño técnico

### Archivos a modificar

1. **`src/app/lista/[id]/page.tsx`** (formulario de añadir)
   - Línea 153: Cambiar `min={1}` por `min={0}` y agregar `step="0.01"`
   - Línea 155: Cambiar `Math.max(1, Number(e.target.value))` por `Math.max(0, Number(e.target.value) || 0)`

2. **`src/components/ListItemRow.tsx`** (formulario de editar)
   - Línea 83: Cambiar `min={1}` por `min={0}` y agregar `step="0.01"`
   - Línea 85: Cambiar `Math.max(1, Number(e.target.value))` por `Math.max(0, Number(e.target.value) || 0)`

### Cambios detallados

**page.tsx (añadir elemento):**
```tsx
<input
  id="item-qty"
  type="number"
  min={0}
  step="0.01"
  value={quantity}
  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
  className="w-24 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground dark:border-zinc-700"
/>
```

**ListItemRow.tsx (editar elemento):**
```tsx
<input
  id="edit-qty"
  type="number"
  min={0}
  step="0.01"
  value={quantity}
  onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
  className="w-24 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground dark:border-zinc-700"
/>
```

### Tipos

No se requieren cambios en `src/lib/types.ts`. El tipo `quantity: number` ya soporta decimales.

### Display

El componente `quantityLabel` en `ListItemRow.tsx` (línea 23-26) ya muestra el valor correctamente usando template literal `${item.quantity}`, que maneja decimales nativamente.

## Criterios de aceptación

- [ ] CA-1: Dado el formulario de añadir elemento, cuando el usuario ingresa "0.5" en el campo cantidad, entonces se guarda el valor 0.5.
- [ ] CA-2: Dado el formulario de añadir elemento, cuando el usuario ingresa "0" en el campo cantidad, entonces se guarda el valor 0.
- [ ] CA-3: Dado el formulario de editar elemento, cuando el usuario cambia la cantidad a "1.25", entonces se guarda el valor 1.25.
- [ ] CA-4: Dado un elemento con cantidad 0.5 y unidad "kg", entonces se muestra "0.5 kg" en la vista.
- [ ] CA-5: Dado que el usuario intenta ingresar un número negativo, entonces el input corrige a 0.
- [ ] CA-6: Dado un elemento existente con cantidad entera (ej: 3), cuando se edita, entonces el valor se muestra correctamente y se puede cambiar a decimal.

## Tareas de implementación (derivadas)

- [ ] T-1: Modificar input de cantidad en `src/app/lista/[id]/page.tsx` (añadir).
- [ ] T-2: Modificar input de cantidad en `src/components/ListItemRow.tsx` (editar).
- [ ] T-3: Ejecutar `npm run lint` para verificar no hay errores.
- [ ] T-4: Ejecutar `npm run build` para verificar la build completa.

## Notas / decisiones

- El mínimo se establece en 0 (no negativos). Un usuario podría querer poner 0 como placeholder temporal.
- Se usa `step="0.01"` para permitir hasta 2 decimales, que es suficiente para la mayoría de casos de uso (peso, volumen).
- El operador `|| 0` en `Number(e.target.value) || 0` maneja el caso de input vacío (retorna 0 en lugar de NaN).
- No se requiere validación de máximo ya que el tipo `number` de JavaScript maneja valores grandes nativamente.
