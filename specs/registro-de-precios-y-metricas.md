# Registro de precios y métricas de gasto

**Estado**: draft
**Versión**: v1
**Fecha**: 2026-09-09

## Contexto / Objetivo

Al completar un elemento durante la compra, hoy solo queda el tachado (`toggleItem`). No hay forma de anotar **cuánto se pagó**, ni de volver a consultar el historial de precios de un producto, ni de saber cuánto se gasta por lista y por mes. El escáner de códigos de barras fue **descartado** (`specs/escaneo-codigos-de-barras.md`) por depender de una API externa que no cubría el mercado local — la lección no es "evitar datos de precios" sino **no depender de servicios de terceros**; los datos propios sí se pueden registrar.

Objetivo: al marcar un item como comprado se puede **guardar el precio pagado**; se mantiene un **historial de precios por producto**; y se ofrecen **métricas**: variación de precio de un producto entre compras y **gasto mensual** (por lista y global). Sin APIs externas: Supabase (backend propio ya integrado) + store local.

## Requisitos funcionales

- [ ] RF-1: Al **tachar** un item pendiente se ofrece registrar el precio pagado (input numérico opcional con "Omitir"); el precio queda visible en el item completado (ej. "— $123,50") y se puede editar/borrar después.
- [ ] RF-2: **Último precio** en el item: `ListItem.purchasePrice?: number` (se sincroniza con el upsert de item existente; columna `list_items.purchase_price`).
- [ ] RF-3: **Historial**: tabla `item_purchases` con `(id, list_id, item_id, product_name, price, quantity, unit, purchased_at, purchased_by, created_at)`; cada compra con precio guardado agrega una fila. El nombre se congela en el momento (si el item se renombra luego, el historial conserva el producto comprado).
- [ ] RF-4: **Variación de precio**: para un producto, entre compras consecutivas del mismo, se calcula el % de cambio (positivo/negativo) y se muestra (ej. "última compra: -8,3%").
- [ ] RF-5: **Gasto mensual**: suma de precios de las compras del mes natural, **por lista** y **global**; rango seleccionable (mes actual / mes anterior / últimos 3 meses / todo).
- [ ] RF-6: **UI de métricas**: página `/estadisticas` (accesible desde el home) con el panel de métricas.
- [ ] RF-7: Sin sesión el detalle es read-only (`isReadOnly`), por lo que **no** se registran precios (no hay tachado); el historial requiere sesión.
- [ ] RF-8: Al **eliminar** un item (o "eliminar completados"), el historial de compras **se conserva** (métricas basadas en compras pasadas del producto, no del item).

## Requisitos no funcionales

- RNF-1: **Sin APIs externas**: los datos viven en Supabase propio (tabla nueva con RLS por membresía, patrón `list_items`) + caché local. Ningún lookup de precios de mercado.
- RNF-2: **Decisión de datos**: sincronizado (Supabase), no local. Justificación en Notas.
- RNF-3: `price` numérico ≥ 0 con hasta 2 decimales; formato moneda con `Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" })` (mercado local; validar moneda con el dueño — anotado en Notas).
- RNF-4: Accesible: input con `label`, dialog con foco inicial y `Escape`, tabla/listas de métricas semánticas con `aria-label`; populares patrones `ConfirmDialog`/`CreateListDialog`.
- RNF-5: **Offline/consistencia**: registrar el precio es best-effort con sesión (patrón `pushItemToRemote`); el historial se lee de la BD (las métricas requieren red en v1 — nota: mejora futura de caché offline).
- RNF-6: Migración idempotente + snapshot `schema.sql`.
- RNF-7: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.

## Reglas de UX/UI

- **Al tachar**: después de completar un item se muestra un dialog pequeño y **no bloqueante** "¿Qué pagaste por <nombre>?" con input numérico, "Omitir" y "Guardar". En **modo foco no aparece** el dialog (el flujo es rápido); el precio se agrega después desde el item completado.
- **En el item completado**: un botón precio (icono `Tag`/`BadgeDollarSign` de lucide, **verificar export en la versión instalada**) muestra/edita el precio; si hay historial, una línea chica con la última variación (%).
- **En `/estadisticas`**: resumen del mes (global + por lista, con barra relativa), detalle por producto (último precio, variación vs compra anterior, n compras) y selector de rango. Sin gráficos de librerías: barras con divs (patrón `ProgressSummary`/barra del `ListCard`).
- **Lecturas**: el costo percibido debe ser cero en el flujo normal de compra (el dialog aparece solo al tachar y se puede omitir con un toque).
- El precio nunca bloquea el tachado: primero se tacha, luego se ofrece registrar.

## Diseño técnico

### Datos y sync

- **Migración** `supabase/migrations/<timestamp>_item_purchases.sql` (idempotente):
  - `alter table public.list_items add column if not exists purchase_price numeric;`
  - `create table if not exists public.item_purchases (id uuid primary key default gen_random_uuid(), list_id uuid not null references public.lists(id) on delete cascade, item_id uuid references public.list_items(id) on delete set null, product_name text not null, price numeric not null check (price >= 0), quantity numeric not null default 1, unit text, purchased_at timestamptz not null default now(), purchased_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now());`
  - Índices: `item_purchases (list_id, purchased_at)`, `item_purchases (product_name)`.
  - **RLS por membresía** copiando las 4 políticas de `list_items` (select/insert/update/delete si el usuario es miembro de `list_id` vía `list_members`).
  - Snapshot `supabase/schema.sql` actualizado.
- **`src/lib/types.ts`**: `ListItem.purchasePrice?: number`; `interface ItemPurchase { id; listId; itemId; productName; price; quantity; unit?; purchasedAt; purchasedBy? }`.
- **`src/lib/sync/db.ts`**: `ListItemRow.purchase_price` mapeado en `toListItem`/`toListItems`; `ItemPurchaseRow` + `toItemPurchase`.
- **`src/lib/sync/service.ts`**:
  - `applyItemsMutation` (upsert) incluye `purchase_price: item.purchasePrice ?? null`.
  - `recordPurchase(supabase, purchase)` (insert en `item_purchases`, best-effort).
  - `fetchPurchaseHistory(supabase, userId): Promise<ItemPurchase[]>` (todas las listas del usuario vía membresía + RLS o query por `list_id IN (mis listas)`).
- **`src/lib/stores/listStore.ts`**: `setPurchasePrice(listId, itemId, price)` (bump + push por item, patrón `updateItem`). El registro del historial se dispara desde la UI (`recordPurchase`), no desde el store (para no acoplar sync-server en el store).

### Lógica pura (testeable)

- **`src/lib/prices.ts`** (nuevo, puro):
  - `formatPrice(value: number): string` (es-AR, ARS; param `locale`/`currency` con defaults).
  - `priceVariation(prev: number, curr: number): number | null` — % redondeado a 1 decimal; `null` si `prev <= 0` o falta.
  - `monthlySpendByList(purchases, year, month): Record<string, number>`.
  - `monthlySpendTotal(purchases, year, month): number`.
  - `spendByRange(purchases, from: number): Record<string, number>` (para "últimos 3 meses"/"todo").
  - `latestTwoFor(purchases, productName): ItemPurchase[]`.

### UI

- **`src/components/PurchasePriceDialog.tsx`** (nuevo): dialog "¿Qué pagaste?" con input numérico (step 0.01, min 0), "Omitir"/"Guardar"; props `{ open, itemName, onSave(price), onSkip }`. Solo modo normal (no foco).
- **`src/components/ListItemRow.tsx`**: al completar (checkbox/toggle) en modo normal, abre el dialog (via prop elevada `onToggleCompleted` opcional o estado interno del dialog — ver Nota de integración con Spec A); en completados muestra `formatPrice(item.purchasePrice)` y el botón de editar precio; en foco, solo el botón posterior.
- **`src/app/lista/[id]/page.tsx`**: orquesta el dialog de precio (estado `priceFor: ListItem | null`), guarda con `setPurchasePrice` + `recordPurchase`; pasa props a las filas.
- **`src/components/StatsView.tsx`** (nuevo): consume `fetchPurchaseHistory` (vía server action `getPurchaseHistory` o llamada directa) + `prices.ts`; props `{ purchases }` para que el cálculo sea puro y testable; render de resumen por lista/global y detalle por producto.
- **`src/app/estadisticas/page.tsx`** (nuevo, client): página que fetchea el historial y monta `StatsView` (**fuera** del coverage; smoke test).
- **`src/app/page.tsx`** (home): botón de acceso en el header (icono `BarChart3` de lucide, verificar export).
- **`vitest.config.ts`**: agregar al `include`: `src/lib/prices.ts`, `src/components/PurchasePriceDialog.tsx`, `src/components/StatsView.tsx`, y (decisión) `src/components/ListItemRow.tsx` (ya propuesto en Spec A; ver colisión).

## Cobertura de tests

- `src/lib/prices.test.ts` (puro): `formatPrice` (es-AR/ARS, 2 decimales, 0), `priceVariation` (+/-/null), `monthlySpendByList`/`monthlySpendTotal` (filtra mes/año), `spendByRange`, `latestTwoFor`.
- `src/components/PurchasePriceDialog.test.tsx`: input, validación (negativos no pasan), Guardar → `onSave`, Omitir → `onSkip`, Escape no guarda.
- `src/components/ListItemRow.test.tsx` (extender): item completado muestra el precio formateado; click en botón precio abre el dialog; al completar en modo normal NOTIFICA para abrir el dialog (y no en modo foco).
- `src/app/lista/[id]/page.test.tsx` (smoke, página fuera del coverage): al tachar se abre el dialog; guardar llama a `setPurchasePrice` (mock del store) y `recordPurchase`.
- `src/components/StatsView.test.tsx`: resumen por lista/global, selector de rango cambia totales, producto con variación, historial vacío → EmptyState/aviso.
- `src/lib/sync/db.test.ts` (extender, fuera del coverage): mapeo `purchase_price`/`toItemPurchase`.
- Verificar thresholds globales 80/75.

## Criterios de aceptación

- [ ] CA-1: Dado un item pendiente, cuando lo tacho y guardo "450", entonces el item completado muestra "$ 450,00" y el historial registra la compra con `product_name`, precio y fecha.
- [ ] CA-2: Dado el mismo producto comprado antes a $100 y ahora a $120, entonces la variación muestra "+20%" y el precio del item refleja el último valor.
- [ ] CA-3: Dadas compras de febrero (dos listas) y marzo, cuando consulto el gasto del mes, entonces la métrica por lista y global suma solo las compras del mes seleccionado.
- [ ] CA-4: Dado el selector de rango ("últimos 3 meses"/"todo"), cuando cambio, entonces los totales se recalculan.
- [ ] CA-5: Dado un precio registrado, cuando edito/borro el precio del item, entonces el último precio visible cambia y las métricas se actualizan.
- [ ] CA-6: Todo el dato sale de Supabase propio/local: **no** hay llamadas a APIs externas de precios.
- [ ] CA-7: Sin sesión, el detalle read-only no ofrece registrar precios (y no rompe).
- [ ] CA-8: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [ ] T-1: Migración SQL (`purchase_price` + `item_purchases` con RLS/índices) + snapshot `schema.sql`.
- [ ] T-2: Tipos (`purchasePrice`, `ItemPurchase`) + `db.ts`/`service.ts` + tests de mappers.
- [ ] T-3: `prices.ts` (puro) + test.
- [ ] T-4: `listStore.setPurchasePrice` (lógica por helpers; store fuera del coverage).
- [ ] T-5: `PurchasePriceDialog` + test.
- [ ] T-6: `ListItemRow` (precio visible + botón + apertura del dialog al completar) + tests, en integración con los gestos de Spec A.
- [ ] T-7: Orquestación en `page.tsx` (estado `priceFor`, guardado + `recordPurchase`) + smoke test.
- [ ] T-8: `StatsView` + test; `src/app/estadisticas/page.tsx` + link en el home + smoke test.
- [ ] T-9: `vitest.config.ts` (include) + verificación `npm test`/`lint`/`tsc`/`build`.

## Notas / decisiones

- **Sync vs local: decisión → sincronizado (Supabase).** Justificación: (1) el que compra es el que registra el precio, pero el que consulta el historial puede ser su pareja en el mismo dispositivo o en otro → el dato debe viajar con la lista; (2) las métricas globales pierden sentido si cada dispositivo tiene un fragmento (lección inversa del escáner: el problema de OF-Facts era el *lookup externo*, no *guardar datos propios*); (3) la infraestructura (RLS por membresía, upsert de items, pull al reconectar) ya existe. Costo: migración + tabla nueva. La alternativa local queda descartada salvo que el dueño quiera estrictamente privacidad de gastos por dispositivo.
- **Contra-argumento reconocido**: el gasto es dato sensible; si el dueño prefiere precios locales por dispositivo, la tabla `item_purchases` se elimina del alcance y `purchasePrice` queda local. **Pregunta de alto impacto para el dueño — validar antes de aprobar.**
- **Integración con Spec A**: D se apoya en el flujo de completado de A (toggle/swipe/pin). El dialog de precio se dispara desde el hook de swipe/toggle de A sin reescribir `handleToggle` dos veces. **Orden recomendado: C → A → B → D** (D último, sobre la base de gestos de A).
- **Historial sin item**: `item_id` es `on delete set null` y el historial sobrevive a "eliminar completados" (RF-8): las métricas se basan en `product_name` congelado, no en el item vivo.
- **Moneda**: ARS/es-AR hardcodeado como default (mercado local, 779 Mercosur); se parametriza en `formatPrice` por si el dueño pide otra moneda.
- **Métricas offline**: v1 requiere red (fetch a Supabase). Mejora futura: caché local del historial (zustand persist, patrón `listStore`) y aviso "sin conexión" en la página. Anotado como limitación para no inflar este spec.
- **Nombres de iconos**: verificar export de `Tag`/`BadgeDollarSign` y `BarChart3` en la versión instalada de `lucide-react`.
- **Coverage**: `ListItemRow.tsx` entra al include (ya propuesto en Spec A); si los thresholds 80/75 se complicaran, se reverte y se cubre con smoke del detalle.