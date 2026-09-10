# Mi despensa — catálogo personal de productos frecuentes

**Estado**: implemented
**Versión**: v1
**Fecha**: 2026-09-09

## Contexto / Objetivo

El **formulario de alta** del detalle (`src/components/AddItemForm.tsx`, spec `fab-form-item-detalle.md`) exige teclear el nombre completo de cada producto en cada visita, incluso los que se compran todas las semanas. El **escáner de códigos de barras fue descartado** (`specs/escaneo-codigos-de-barras.md`) justamente porque depender de una API externa (Open Food Facts) no resolvía los productos del mercado local; como iteración futura ese spec propuso **"un enfoque local-first con sugerencias de productos frecuentes del usuario"** — eso es exactamente esta feature.

Objetivo: un **catálogo personal** (local-first) con los productos que el usuario suele agregar: nombre, y metadatos opcionales (emoji, pasillo, marca). Se alimenta de forma **automática** desde lo que el usuario ya agrega (auto-aprendizaje), se puede **editar a mano**, y sirve de fuente de **sugerencias** en `AddItemForm` (chips de repetidos) y en el detalle. **Sin APIs externas**.

## Requisitos funcionales

- [x] RF-1: Store local `pantryStore` persistido (`super-list-pantry`) con productos `{ id, name, emoji?, aisle?, brand?, count, lastUsedAt }`, deduplicados por nombre normalizado.
- [x] RF-2: **Auto-aprendizaje**: cada alta de item desde `AddItemForm` registra el producto; si ya existe incrementa `count` y actualiza `lastUsedAt`; si es nuevo lo crea con `count: 1`. No rompe ni bloquea el alta (best-effort).
- [x] RF-3: **Edición manual** ("Mi despensa"): listar productos, buscar, editar nombre/emoji/pasillo/marca, y eliminar (con `ConfirmDialog`). Accesible desde el home.
- [x] RF-4: **Sugerencias en `AddItemForm`**: al escribir (o vacío), se muestran chips con los productos frecuentes que coinciden con el texto; tocar un chip completa el campo de nombre. Hasta 6 chips, ordenados por `count desc, lastUsedAt desc`. Funciona en modo normal y en **modo foco**.
- [x] RF-5: **Detalle de lista**: la misma fuente alimenta el detalle (mismo form) y, cuando un item coincide (por nombre normalizado) con un producto de la despensa, se muestra su `emoji` junto al nombre del item (decorativo).
- [x] RF-6: **Normalización**: "leche", " Leche " y "LECHE" deduplican en una sola entrada (`trim` + lowercase + colapso de espacios).
- [x] RF-7: Categoría de producto **no** se sincroniza ni se comparte: el catálogo es 100% local del dispositivo.

## Requisitos no funcionales

- RNF-1: **Datos 100% locales**: zustand `persist` en localStorage, patrón `barcodeStore` (mapa aprendido, `escaneo-codigos-de-barras.md`) y `preferencesStore`. **Sin sincronización** ni tabla nueva en Supabase (decisión justificada en Notas). **Sin APIs externas**.
- RNF-2: **Cap de tamaño**: máximo ~500 productos; ante exceso se evicta por `lastUsedAt` (LRU). Escrituras protegidas con try/catch para no tocar `QuotaExceededError` (patrón barcodeStore).
- RNF-3: El auto-aprendizaje no agrega código acoplado al coverage-exclude: la llamada a `recordItem` vive en `AddItemForm` (ya cubierto) y el store/selectors nuevos entran al include.
- RNF-4: Accesible: chips como botones con `aria-label` (ej. "Usar Leche"); la edición usa patrones existentes (`ConfirmDialog`, `CreateListDialog`); textos en español.
- RNF-5: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.

## Reglas de UX/UI

- **Chips de sugerencias**: fila horizontal scrollable bajo el input de nombre, visibles mientras no se haya confirmado el alta; desaparecen si el texto no coincide con ningún producto; al tocar se rellena el input (no auto-agrega, consistente con voz/escáner: "completa el campo, el usuario confirma").
- **"Mi despensa"**: pantalla simple: input de búsqueda, lista de productos (nombre + emoji/pasillo/marca secundarios + count), edición inline en un dialog pequeño, eliminación con confirmación. La entrada se ubica en el header del home (icono contenedor/despensa), sin competir con `UserMenu`/`ThemeToggle`.
- El emoji del producto en el detalle (RF-5) es **decorativo** (`aria-hidden`): el nombre del item sigue siendo el texto accesible.

## Diseño técnico

### Store y lógica pura

- **`src/lib/productNames.ts`** (nuevo, puro): `normalizeProductName(name: string): string` (`trim`, lowercase, colapso de espacios en blanco).
- **`src/lib/pantrySelectors.ts`** (nuevo, puro): `suggestProducts(products, query, limit): PantryItem[]` (filtra por coincidencia `includes` sobre el nombre normalizado, ordena `count desc, lastUsedAt desc`, corta en `limit`); `evictToCap(products, cap): PantryItem[]` (LRU por `lastUsedAt`).
- **`src/lib/stores/pantryStore.ts`** (nuevo): zustand `persist` (`name: "super-list-pantry"`, patrón `barcodeStore`/`preferencesStore`):
  - Shape: `{ products: PantryItem[] }` + actions `recordItem(name)`, `upsertProduct(input)`, `removeProduct(id)`.
  - `recordItem` usa `normalizeProductName`; si el producto existe, `count+1` y `lastUsedAt = Date.now()`; si no, crea `{ id: newId(), name: normalized, count: 1, ... }` y evicta por cap.
  - Todas las mutaciones con try/catch (no romper el flujo de alta si localStorage falla).
- **`src/lib/types.ts`** o tipos locales del store: `interface PantryItem { id: string; name: string; emoji?: string; aisle?: string; brand?: string; count: number; lastUsedAt: number }`.

### UI

- **`src/components/PantryChips.tsx`** (nuevo): fila de chips; props `{ name: string; onPick: (name: string) => void }`; internamente consulta `suggestProducts` (vía `pantryStore.getState()` con suscripción reactiva del store). Render `null` si no hay sugerencias.
- **`src/components/AddItemForm.tsx`**: renderiza `PantryChips` bajo el input de nombre (en ambas variantes); en `handleAdd`, tras `addItem`, llama `pantryStore.getState().recordItem(name)` (fire-and-forget).
- **`src/components/PantryEditor.tsx`** (nuevo): componente client con la lista + búsqueda + dialog de edición (`PantryItemDialog` interno, patrón `CreateListDialog`) + `ConfirmDialog` para eliminar. Entra al coverage.
- **`src/app/despensa/page.tsx`** (nuevo, client): página "Mi despensa" que monta `PantryEditor` (patrón de página orquestadora; **fuera** del coverage, smoke test como las demás páginas).
- **`src/app/page.tsx`** (home): botón de acceso en el header (icono `Package` o `Warehouse` de lucide, **verificar export en la versión instalada**; alternativas `Grid2x2`/`Boxes`) → `Link` a `/despensa`. Solo aporta con sesión o sin ella (el catálogo es local, funciona también sin sesión).
- **`src/components/ListItemRow.tsx`**: en el detalle, si el nombre del item coincide con un producto (`pantrySelectors` por nombre), muestra su `emoji` antes del nombre (`aria-hidden`, tamaño `text-base`). Cambio mínimo y no destructivo (ver colisión con Specs A/D en Notas).

### Integración con coverage

- `vitest.config.ts`: agregar al `include`: `src/lib/productNames.ts`, `src/lib/pantrySelectors.ts`, `src/lib/stores/pantryStore.ts`, `src/components/PantryChips.tsx`, `src/components/PantryEditor.tsx`.

## Cobertura de tests

- `src/lib/productNames.test.ts` (puro): trim/case/espacios, no-op en vacío.
- `src/lib/pantrySelectors.test.ts` (puro): sugerencias con límite y orden, evicción LRU.
- `src/lib/stores/pantryStore.test.ts`: patrón `preferencesStore.test.ts` (localStorage jsdom): `recordItem` crea/incrementa/deduplica, `upsertProduct`/`removeProduct`, cap evicta el menos usado, datos sobreviven a re-hidratación.
- `src/components/PantryChips.test.tsx`: mock del store (patrón `vi.hoisted` de `AddItemForm.test.tsx`); muestra chips ordenados, oculta sin coincidencias, `onPick` completa.
- `src/components/PantryEditor.test.tsx`: lista, búsqueda, editar emoji/pasillo/marca, eliminar con confirmación.
- `src/components/AddItemForm.test.tsx` (extender): `PantryChips` visible/funcional (mock del componente o del store) y `recordItem` llamado con el nombre al agregar (mock de `pantryStore` con `vi.hoisted`).
- `src/app/page.test.tsx` (smoke, página fuera del coverage): existe el link a "Mi despensa".
- Verificar thresholds globales 80/75.

## Criterios de aceptación

- [x] CA-1: Dado que agrego "Leche" en una lista tres veces, entonces en la despensa aparece "Leche" con `count: 3` y es la primera sugerencia en los chips.
- [x] CA-2: Dado `AddItemForm`, cuando escribo "le", entonces los chips sugieren los productos coincidentes y al tocarlos se completa el campo de nombre.
- [x] CA-3: Dado el home, cuando entro a "Mi despensa", edito emoji/pasillo/marca y recargo, entonces los cambios persisten.
- [x] CA-4: Dado un producto de la despensa, cuando lo elimino con confirmación, entonces desaparece del catálogo y de los chips.
- [x] CA-5: Dado "leche", " Leche " y "LECHE", cuando se registran, entonces queda una única entrada normalizada.
- [x] CA-6: Dado el detalle de una lista, cuando un item coincide con un producto de la despensa, entonces se muestra su emoji junto al nombre (decorativo, `aria-hidden`).
- [x] CA-7: Sin conexión y sin APIs externas, el catálogo y las sugerencias funcionan (localStorage); un localStorage lleno no rompe el alta de items.
- [x] CA-8: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [x] T-1: `productNames.ts` + `pantrySelectors.ts` (puros) + tests.
- [x] T-2: `pantryStore.ts` (persist, cap, try/catch) + test.
- [x] T-3: `PantryChips` + integración en `AddItemForm` (render + `recordItem` en `handleAdd`) + tests extendidos.
- [x] T-4: `PantryEditor` (+ dialog interno) + test.
- [x] T-5: `src/app/despensa/page.tsx` + link en el home + smoke test.
- [x] T-6: Emoji decorativo en `ListItemRow` (match por nombre normalizado).
- [x] T-7: `vitest.config.ts` (include) + verificación `npm test`/`lint`/`tsc`/`build`.

## Notas / decisiones

- **Local vs sync: decisión → 100% local (v1).** Justificación: (1) el mapa aprendido ya tiene precedente local en `barcodeStore` (no sincronizado por diseño) y la lección del escáner descartado apunta a "local-first"; (2) el catálogo refleja hábitos del dispositivo y no requiere tabla nueva ni migración ni alcanzar RLS; (3) sync sería una evolución trivial (los productos son records planos, se podrían subir a una tabla `pantry_items` por usuario en un spec futuro si el dueño lo pide). El precio de esto es que la despensa **no** se replica entre dispositivos de la misma cuenta — anotado como limitación.
- **Auto-aprendizaje sin acoplarse a `listStore`** (que está excluido del coverage): la escritura ocurre desde `AddItemForm.handleAdd`, que ya está en el include; así el aprendizaje se testea sin mockear la capa de sync.
- **No auto-agrega**: consistente con voz (`dictado-por-voz`) y con la decisión del escáner descartado: el chip completa el campo y el usuario confirma "Agregar". Evita alta no deseada de repetidos.
- **Colisiones**: `AddItemForm` lo toca solo esta feature (A/D tocan `ListItemRow`/`listStore`, C toca home+detalle). El emoji en `ListItemRow` (RF-5) es mínimo y aditivo; si A y D ya modificaron esa fila, este cambio se aplica encima sin conflicto conceptual. La entrada del home convive con la de C (botones distintos en el header). **Orden recomendado: C → A → B → D**.
- **Moneda/formato**: no aplica (sin precios).
- **Iconos**: verificar export de `Package`/`Warehouse` (o equivalente) en la versión instalada de `lucide-react` antes de usarlos (patrón del spec de barcode sobre `ScanBarcode`).

## Decisiones de implementación

- `PantryChips` suscribe con `usePantry((s) => s.products)` (hook del store, detalle de specs/A-D como AddItemForm ya cubierto) y delega el orden/límite a `suggestProducts`; render `null` sin sugerencias.
- `recordItem`/`upsertProduct`/`removeProduct` delegan en helpers puros (`recordProduct`, `upsertProductEntry`, `removeProductEntry`) para que el cap LRU y el dedup vivan en `pantrySelectors` (incluido al coverage); el store protege las escrituras de localStorage con try/catch.
- El texto "usos" usa singular/plural (`1 uso` / `N usos`, donde `N` incluye `0 usos` para altas manuales).
- UI: icono `Package` (existe en la versión instalada de lucide-react) en el header del home; página `/despensa` con link de vuelta "Inicio"; el dialog de edición se llama `ProductDialog` (patrón `CreateListDialog`).
- Emoji en `ListItemRow`: `memo` de match por nombre normalizado, `aria-hidden`, tamaño heredado (decorativo, no cambia el texto accesible).

## Checklist final

- `npm test`: 237 tests (38 archivos) ✔
- Coverage global: **91.23% stmts / 85.22% branch / 89.32% funcs / 92.94% lines** (min 80/75/80/80) ✔
  - Nuevos: `productNames.ts` y `pantrySelectors.ts` 100% líneas; `PantryChips.tsx` 100%; `PantryEditor.tsx` 92% líneas / 84% funcs; `pantryStore.ts` 84% líneas.
- `npm run lint`: exit 0 (única advertencia preexistente en `coverage/lcov-report/*`) ✔
- `tsc --noEmit`: limpio ✔
- `next build`: green, ruta `/despensa` estática generada ✔
- QA en navegador (dev server): `/despensa` + CRUD (crear/editar/eliminar producto) + link de home ✔