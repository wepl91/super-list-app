# Migración de SVGs inline a lucide-react

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-03

## Contexto / Objetivo

Los iconos de la app están como **SVGs inline** (paths manuales de estilo Heroicons) repetidos en 8 archivos (`src/app/lista/[id]/page.tsx`, `src/components/{ThemeToggle,AddMemberForm,ListCard,ListOptionsMenu,UserMenu,VoiceDictationButton,ListItemRow}.tsx`). Esto tiene desventajas:

1. **Duplicación**: los mismos paths se repiten copiados/pegados; mantener consistencia es frágil.
2. **Accesibilidad manual**: cada icono necesita `aria-hidden` y clasess/colores a mano; es fácil que se degraden (`viewBox` incorrecto, tamaños inconsistentes).
3. **Coste de mantenimiento**: agregar un icono nuevo requiere copiar un path largo y ajustar el wrapper SVG.

Se propone **adoptar `lucide-react`** (elegido por el dueño): tree-shakeable, compatible con Tailwind v4, accesible por defecto (`aria-hidden` en iconos decorativos, `stroke="currentColor"` para heredar el color), y con `<Icon size>` consistente. Se reemplazan todos los SVGs inline por componentes `lucide-react`.

## Requisitos funcionales

- [x] RF-1: Se agrega `lucide-react` como dependencia y se elimina **todos** los SVGs inline de la app (los `<svg>` manuales desaparecen del código fuente).
- [x] RF-2: Cada icono se reemplaza por su equivalente `lucide-react`, manteniendo el **mismo significado y posición** en la UI.
- [x] RF-3: El **tamaño** visual se preserva: los iconos actuales usan `h-4/h-5/h-6 w-4/w-5/w-6`; los reemplazos usan `size={16|20|24}` equivalente (o `className="h-x w-x"`).
- [x] RF-4: El **color** sigue heredando de `currentColor` / clases `text-*` existentes; los iconos de status de sync (synced/dirty/syncing/local) conservan sus clases de color (`text-emerald-*`, `text-amber-*`, `text-sky-*`, `text-text-secondary`).
- [x] RF-5: Se mantiene la **accesibilidad**: iconos decorativos con `aria-hidden` (que lucide aporta por defecto) y la semántica/`aria-label` de los botones siguen intactas.
- [x] RF-6: Se centraliza opcionalmente un mapeo de iconos comunes (ej. un pequeño set de helpers) si reduce duplicación, sin sobre-ingeniería.

## Requisitos no funcionales

- RNF-1: **Sin regresiones visuales**: el look de los iconos resultantes es equivalente al actual (estilo outline/fill coherente).
- RNF-2: **Bundle**: `lucide-react` es tree-shakeable; se verifica que `next build` no aumente significativamente el bundle y que solo se incluyan los iconos usados.
- RNF-3: `npm run lint`, `tsc --noEmit`, `next build` y `npm test` pasan.
- RNF-4: **Accesibilidad**: `aria-hidden` en iconos decorativos (defecto de lucide), `aria-label`/`title` en los botones se conservan.
- RNF-5: **Regla de proceso**: se actualizan/agregan tests donde cambia markup que los tests inspeccionan; el coverage global se mantiene ≥80% líneas / 75% ramas.

## Diseño técnico

- **Dependencia**: `lucide-react` (agregar a `package.json`).
- **Archivos a modificar** (todos con SVGs inline):
  - `src/components/ListCard.tsx` — reordenar (`GripVertical`), sync: `synced`→`CircleCheck`, `dirty`→`Clock`, `syncing`→`RefreshCw` (con spinner si aplica), `local`→`CloudOff`/`HardDrive`; guardar (`Check`), menú (`EllipsisVertical`), renombrar (`Pencil`), compartir (`Share`), duplicar (`Copy`), eliminar (`Trash2`).
  - `src/components/ListOptionsMenu.tsx` — menú (`EllipsisVertical`/`SlidersHorizontal`), compartir (`Users`/`Share`), ordenar (`ArrowUpDown`), ocultar tachados (`EyeOff`/`Eye`), eliminar completados (`Trash2`).
  - `src/components/UserMenu.tsx` — avatar (`User`), logout (`LogOut`), login/registro (`LogIn`/`UserPlus`), usuario (`UserCircle`), etc.
  - `src/components/ListItemRow.tsx` — editar (`Pencil`), eliminar (`Trash2`).
  - `src/components/ThemeToggle.tsx` — claro/oscuro (`Sun`/`Moon`).
  - `src/components/VoiceDictationButton.tsx` — micrófono (`Mic`).
  - `src/components/AddMemberForm.tsx` — email/envío (`Mail`/`Send`).
  - `src/app/lista/[id]/page.tsx` — volver (`ArrowLeft`/`ChevronLeft`), compartidos (`Users`), modo foco (`Hand`).
- **Patrón de reemplazo**: cada `<svg ...><path/></svg>` → `import { NombreIcono } from "lucide-react"` y `<NombreIcono className="h-4 w-4" aria-hidden />`. Los iconos que hoy usan `fill="currentColor"` (menús, status) se evalúan caso por caso: lucide usa `stroke` por defecto; para mantener igual si hace falta se puede usar variantes `fill` cuando corresponda (ej. `CircleCheck` relleno vs outline) según el look actual del path.

> Mapeo de equivalencias es orientativo; la implementación traduce **cada** icono concreto al nombre lucide más fiel al path actual (many Heroicons paths tienen equivalente directo en lucide).

## Criterios de aceptación

- [x] CA-1: No queda **ningún** `<svg>` inline manual en `src` (todos reemplazados por `lucide-react`).
- [x] CA-2: `lucide-react` está en `package.json` como dependencia.
- [x] CA-3: Cada pantalla (home, detalle de lista, menús, modales) muestra iconos equivalentes al estado previo, sin cambios visuales notorios (verificado por el dueño en el navegador).
- [x] CA-4: Los botones con icono conservan su `aria-label`/`title`; los iconos decorativos son `aria-hidden`.
- [x] CA-5: `npm run lint`, `tsc --noEmit`, `next build` y `npm test` pasan; coverage ≥80% líneas / ≥75% ramas.
- [x] CA-6: Los tests existentes que inspeccionan markup se actualizan y pasan; los nuevos componentes agregados (si los hay) tienen test.

## Tareas de implementación (derivadas)

- [x] T-1: Instalar `lucide-react`.
- [x] T-2: Reemplazar SVGs en `ListCard.tsx` (incluye los 4 estados de sync) y actualizar su test.
- [x] T-3: Reemplazar SVGs en `ListOptionsMenu.tsx`, `UserMenu.tsx`, `ListItemRow.tsx`, `ThemeToggle.tsx`, `VoiceDictationButton.tsx`, `AddMemberForm.tsx`.
- [x] T-4: Reemplazar SVGs en `src/app/lista/[id]/page.tsx`.
- [x] T-5: Verificar visualmente en el navegador que no hay regresiones (iconos bien renderizados, colores correctos).
- [x] T-6: Correr `npm run lint`, `tsc --noEmit`, `next build` y `npm test` (+ coverage).

## Notas / decisiones

- **Librería elegida por el dueño**: `lucide-react` (por compatibilidad con Tailwind v4, tree-shaking y accesibilidad por defecto).
- **Nombres orientativos**: los nombres lucide del diseño técnico son una guía; la implementación busca el icono más fiel al path actual (la mayoría de los paths actuales son de Heroicons y tienen equivalente directo).
- **`fill` vs `stroke`**: la mayoría de los iconos actuales usan `fill="currentColor"`; lucide usa `stroke` por default. Si un icono específico se vería distinto, se usa la variante adecuada de lucide (ej. `CircleCheck` filled, `CircleCheckBig`, etc.) para no alterar el look.
- **No sobre-ingeniería**: no se crea una capa de abstracción de iconos salvo que presente valor real; se usa directo `lucide-react`.
