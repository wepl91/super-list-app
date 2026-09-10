# Identidad visual por lista (color y emoji)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-09

## Contexto / Objetivo

Las listas se distinguen hoy **solo por su nombre** en el home (`src/app/page.tsx` + `src/components/ListCard.tsx`: nombre, contador y barra de progreso) y en el detalle (`src/app/lista/[id]/page.tsx`: `h1` con el nombre). Con varias listas activas (mercado, farmacia, ferretería) cuesta identificarlas de un vistazo, y no hay forma de personalizarlas.

Objetivo: cada lista tiene un **color** y un **emoji** elegidos por su propietario, visibles en el home (`ListCard`), en el detalle y para los **invitados/compartidos**. Los valores viajan como data de la lista (columna `color`/`emoji` en `lists`) y se sincronizan con la capa existente de Supabase sin tocar Realtime.

## Requisitos funcionales

- [x] RF-1: `List` gana `color?: ListColor` y `emoji?: string` (`emoji` single grapheme opcional, ej. 🛒); la tabla `lists` gana las columnas `color` y `emoji` (migración idempotente).
- [x] RF-2: **Al crear** una lista se asigna un color por defecto **determinístico** (derivado del `id`); el emoji queda vacío por defecto (la lista se ve sin emoji).
- [x] RF-3: **Edición**: el **owner** puede cambiar color y emoji desde el detalle (header) y desde el menú del `ListCard`; un componente único `ListIdentityEditor` se reutiliza en ambos puntos.
- [x] RF-4: **Home**: `ListCard` muestra el emoji junto al nombre y un acento de color (borde izquierdo o fondo suave), en listas propias y compartidas.
- [x] RF-5: **Detalle**: el header muestra el emoji junto al `h1` y un acento de color; el botón de editar identidad es visible solo para el owner.
- [x] RF-6: **Invitados/compartidos**: los `editor` ven el color y emoji elegidos por el dueño (llegan por `pullAll`, que ya trae las listas de las que son miembros).
- [x] RF-7: **Sync**: `color`/`emoji` se incluyen en `upsertList` y en el `select` de `pullAll`; sin cambios en Realtime (D5 de `supabase-storage.md`: solo `list_items` en vivo; la identidad llega con el pull/recarga).
- [x] RF-8: Sin sesión (lista local), el color/emoji se guardan en el store local y se suben al iniciar sesión (el flujo `dirty → synced` existente los incluye).

## Requisitos no funcionales

- RNF-1: **Sin librerías nuevas** (ni emoji picker externo): selector propio con una lista preseleccionada de ~30 emojis + campo libre opcional.
- RNF-2: `color` es una **clave de la paleta del sistema** (`"emerald" | "sky" | "amber" | "rose" | "violet" | "teal"`, alineadas con el token `primary` #059669/#10b981): las clases se resuelven con un **lookup explícito** (objeto de mapeo), nunca con templates de strings (Tailwind purgaría clases dinámicas). El acento **no se usa como color de texto** (solo borde/fondo), para no romper contraste.
- RNF-3: El emoji es **decorativo** (`aria-hidden`); el nombre de la lista sigue siendo el texto accesible.
- RNF-4: Un valor inválido proveniente del server (o de una versión vieja) no rompe el render: se cae al default/fallback.
- RNF-5: Migración idempotente (`add column if not exists`) + actualización del snapshot `supabase/schema.sql` (convención del repo).
- RNF-6: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.

## Reglas de UX/UI

- **Palette**: 6 colores del sistema; el activo se marca con anillo + `aria-pressed` en un grupo de swatches.
- **Emoji picker**: grilla de ~30 emojis comunes (🛒 🧾 🍎 💊 🛠 👶 🐾 🎄 🏖 🎁 …) como botones `aria-label="Emoji <descripción>"` + un input de texto libre validado (máx. 2 code points) para emojis fuera de la lista. "Sin emoji" es una opción explícita.
- El editor es un **dialog** (`role="dialog"`, `aria-modal`, foco al abrir, `Escape` cierra) con Guardar/Cancelar, patrón `CreateListDialog`/`ConfirmDialog`.
- En `ListCard`, el acento de color **no** compite con el `role="progressbar"` existente: se aplica en el contenedor de la card (borde) y el emoji junto al nombre.

## Diseño técnico

### Datos y sync

- **Migración** `supabase/migrations/<timestamp>_identidad_visual_listas.sql` (idempotente):
  ```sql
  alter table public.lists add column if not exists color text;
  alter table public.lists add column if not exists emoji text;
  ```
  + snapshot `supabase/schema.sql` (columnas en `lists`).
- **`src/lib/types.ts`**: `export type ListColor = "emerald" | "sky" | "amber" | "rose" | "violet" | "teal";` y en `List`: `color?: ListColor; emoji?: string;`.
- **`src/lib/sync/db.ts`**: `ListRow.color`, `ListRow.emoji`; `toList` los mapea (con validación suave hacia `ListColor`).
- **`src/lib/sync/service.ts`**:
  - `pullAll`: el `select` de `lists` pasa a `"id, owner_id, name, position, color, emoji, created_at, updated_at"`.
  - `upsertList`: incluye `color: list.color ?? null, emoji: list.emoji ?? null`.
  - Realtime intacto.
- **`src/lib/listIdentity.ts`** (nuevo, puro): `LIST_COLORS: ListColor[]`, `defaultColorFor(id: string): ListColor` (hash del id contra la palette, determinístico), `normalizeEmoji(emoji?: string): string | undefined` (trim, máx. 2 code points con `[...str]`, inválido → `undefined`), y el **lookup de clases** `colorAccentClass(color)` / `colorBorderClass(color)` (objetos literales con las clases Tailwind reales de la build).
- **`src/lib/stores/listStore.ts`**: `createList` asigna `color: defaultColorFor(newId())`; nueva acción `setListIdentity(id, identity: { color: ListColor; emoji?: string })` (patrón `renameList`: bump `syncStatus: "dirty"` + `pushListToRemote` con sesión). `cloneList` copia `color`/`emoji` del origen.

### UI

- **`src/components/ListIdentityEditor.tsx`** (nuevo, client): dialog con props `{ list, open, onClose }`; estado local `color`/`emoji`; swatches (`role="radiogroup"` o grupo de botones con `aria-pressed`), grilla de emojis, input libre, "Sin emoji", Guardar → `useListStore.getState().setListIdentity(...)` + `onClose`.
- **`src/components/ListCard.tsx`**: muestra `emoji` antepuesto al nombre (`aria-hidden` `span`) y clase de acento del lookup sobre el `<li>`/contenedor; **nuevo menú item "Personalizar"** (junto a Renombrar), que abre `ListIdentityEditor` (solo `isOwner`).
- **`src/app/lista/[id]/page.tsx`**: header con emoji + acento; botón "Personalizar lista" (icono `Palette` de lucide, verificar export en la versión instalada) visible solo si `isOwner`, abre `ListIdentityEditor`.
- **`src/app/page.tsx`**: sin cambios (la card ya renderiza identidad).
- **`vitest.config.ts`**: agregar al `include` `src/lib/listIdentity.ts` y
  `src/components/ListIdentityEditor.tsx`. `ListCard.tsx` **queda testeada pero
  fuera del include** (medirla hundía el threshold global de funciones <80%;
  decisión registrada aquí para no reintentarla sin tests de menú/estados más
  profundos).

## Cobertura de tests

- `src/lib/listIdentity.test.ts` (puro): `defaultColorFor` determinístico y estable, `normalizeEmoji` (trim/inválido/multi-emoji → undefined), accesos del lookup devuelven clases esperadas.
- `src/components/ListIdentityEditor.test.tsx`: render con identity actual, selección de color actualiza `aria-pressed`, elegir emoji/input libre, Guardar llama `setListIdentity` (mock del store con `vi.hoisted`), Cancelar/Escape no guarda, "Sin emoji" limpia, solo abierto con `open`.
- `src/components/ListCard.test.tsx` (extender): emoji visible con `aria-hidden`, acento aplicado, item de menú "Personalizar" solo para `isOwner`, abre el editor.
- `src/app/lista/[id]/page.test.tsx` (smoke, página fuera del coverage): emoji en el header, botón "Personalizar" solo owner.
- `src/lib/sync/db.test.ts` (extender, fuera del coverage pero ya existe): `toList` mapea `color`/`emoji`.
- Verificar thresholds globales 80/75.

## Criterios de aceptación

- [x] CA-1: Dado que creo una lista, entonces tiene un color default determinístico (el mismo id → el mismo color, estable entre sesiones) y sin emoji.
- [x] CA-2: Dado el owner, cuando edito color/emoji desde el detalle o el menú del home, entonces se actualiza en ambos lugares al instante.
- [x] CA-3: Dado un invitado (rol `editor`), cuando ve la lista, entonces ve el mismo color y emoji que eligió el dueño (tras pull).
- [x] CA-4: Dado un cambio de identidad, cuando recargo el dispositivo (o abro en otro con la misma cuenta), entonces la identidad persiste.
- [x] CA-5: Dado un usuario sin sesión, cuando personaliza una lista local y luego inicia sesión, entonces la identidad se sube a la nube.
- [x] CA-6: El emoji no duplica el nombre accesible (`aria-hidden`); el color no se usa como texto (contraste intacto).
- [x] CA-7: Dado un `color` inválido o `emoji` mal formado desde el server, entonces el render no se rompe (fallback al default).
- [x] CA-8: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage ≥80% líneas / ≥75% ramas.

## Tareas de implementación (derivadas)

- [x] T-1: Migración SQL (`color`, `emoji`) + snapshot `schema.sql`.
- [x] T-2: Tipos + `listIdentity.ts` (puros) + test.
- [x] T-3: `db.ts`/`service.ts` (select, upsert, mapeo) + extender `db.test.ts`.
- [x] T-4: `listStore`: `color` en `createList`, `setListIdentity`, `cloneList` (cover vía helpers puros; el store sigue fuera del coverage).
- [x] T-5: `ListIdentityEditor` + test.
- [x] T-6: `ListCard` (emoji + acento + menú "Personalizar") + test.
- [x] T-7: `page.tsx` del detalle (header + botón owner) + smoke test.
- [x] T-8: `vitest.config.ts` (include) + verificación `npm test`/`lint`/`tsc`/`build`.

## Notas / decisiones

- **La identidad es data de la lista, no preferencia local**: la elige el owner y la ven los invitados (RF-6/RF-7). Por eso viaja en la tabla `lists` y se sincroniza, a diferencia de `focusMode`/`hideCompleted` (`preferencesStore`).
- **Alcance de Realtime**: sin cambios — la identidad llega con `pullAll`/recarga (D5 de `supabase-storage.md`). La novedad de verlo "en vivo" en el otro dispositivo no es crítica.
- **Clases Tailwind por lookup**: el mapeo `ListColor → clases` vive en `listIdentity.ts` como objeto literal para que Tailwind no purgue las clases (nunca strings interpolados).
- **`cloneList`** copia la identidad de la lista origen (se espera que el clon se distinga luego).
- **Colisiones**: C toca `page.tsx` (detalle) y `ListCard`/home al igual que A (chips) y B (entrada despensa). Son puntos de tocada distintos (header vs listado; botón vs chips); no hay conflicto de lógica. Es el spec más chico → conviene implementarlo primero. **Orden recomendado: C → A → B → D.**
- **Coverage**: `ListCard.tsx` probó suma al `include` y se **revertó**: sus
  funciones (43%) hundían el global por debajo de 80. Queda testeada (5 tests
  de identidad propios + smoke del home) pero sin medir; la lógica de identidad
  (lookups y helpers) vive en `listIdentity.ts`, que sí se mide (≥97% líneas).