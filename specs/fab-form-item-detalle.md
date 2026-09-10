# FAB de "añadir elemento" en el detalle de lista (form colapsable)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-09

## Contexto / Objetivo

En el **detalle de lista** (`src/app/lista/[id]/page.tsx`), el formulario de alta de elementos ("Añadir elemento") está **siempre visible** como primer elemento de la página, antes de `ProgressSummary` y la lista. Ocupa espacio vertical permanente en la pantalla más usada de la app, en dos variantes: **modo foco** (input nombre grande + dictado + botón "Agregar") y **modo normal** (nombre + dictado + descripción + cantidad + unidad + botón "Añadir").

Objetivo: replicar el patrón ya aplicado en el home (`specs/fab-crear-lista.md`), pero **sin modal**: un **botón flotante (FAB)** con icono `+` que muestra/oculta el formulario en su **ubicación actual** (donde está montado hoy). Mientras no se toque el `+`, el formulario **no se ve**. A diferencia del home, acá el FAB es un **toggle** (no abre un modal): el form vive en el flujo de la página, oculto hasta que se abre.

## Requisitos funcionales

- [ ] RF-1: El detalle de lista ya **no muestra** el form de alta siempre visible: al navegar a la página el form inicia **cerrado** (oculto/no renderizado).
- [ ] RF-2: Un **FAB** flotante (patrón del home) permite abrir/cerrar el form; **solo se renderiza si `isSignedIn`**; sin sesión se mantiene `AuthGateCta` (comportamiento actual preservado).
- [ ] RF-3: El FAB es un **toggle de un solo botón**: cerrado → icono `Plus` con `aria-label="Añadir elemento"` y `aria-expanded="false"`; abierto → icono `X` con `aria-label="Cerrar formulario"` y `aria-expanded="true"`. Usa `aria-controls="add-item-form"`.
- [ ] RF-4: Al tocar el FAB (abrir), el form se **renderiza en su ubicación actual** (antes de `ProgressSummary`/lista, tal como está hoy) y el **foco va al input de nombre**. Al tocar de nuevo (cerrar), el form se oculta y el **foco vuelve al FAB**.
- [ ] RF-5: **Escape también cierra** el form (coherente con los modales) y devuelve el foco al FAB.
- [ ] RF-6: Ambas variantes (modo foco y normal) se siguen alternando con `focusMode` tal como hoy; **ambas quedan ocultas** hasta tocar el FAB. Mientras el form está abierto, cambiar `focusMode` re-renderiza la variante correspondiente.
- [ ] RF-7: Al agregar un elemento (`handleAdd`), el form **se resetea pero permanece abierto** (permite cargar varios elementos seguidos); el cierre es solo con el toggle del FAB o Escape.
- [ ] RF-8: `voiceError` (del dictado) **no se muestra** cuando el form está cerrado; al cerrar se pierde/resetea.
- [ ] RF-9: El copy del `EmptyState` de lista vacía pasa de "Añadí el primer elemento arriba." a **"Añadí el primer elemento tocando el botón +."**. El `EmptyState` de "sin pendientes" no cambia.
- [ ] RF-10: **Sin cambios** en `hideCompleted`/edición inline/`ListOptionsMenu`/menú de compartir.
- [ ] RF-11: El form se **extrae a un componente propio** `AddItemForm.tsx` para poder testearlo directo (regla de proceso de `AGENTS.md`); la página queda como orquestador (FAB + toggle + `AuthGateCta` + lista).
- [ ] RF-12: Queda **todo el código muerto eliminado** de `page.tsx` (estados `name`/`description`/`quantity`/`unit`/`voiceError`, `resetForm`, `handleAdd`, imports de `VoiceDictationButton`/`haptic`/`NewItemInput` que ya no se usan en la página).

## Requisitos no funcionales

- RNF-1: **Accesibilidad**: `aria-expanded` + `aria-controls` entre FAB y form; `aria-label` dinámico según estado; foco inicial al input de nombre al abrir; **devolución de foco al FAB** al cerrar (por toggle y por Escape).
- RNF-2: **Z-index y solapamiento**: mismo criterio que el home — FAB `z-30`, por debajo de menús (`z-40`) y modales (`z-50`), para que nunca tape overlays. Se agrega `pb-24` al contenedor del detalle para que el FAB no tape el último elemento/item.
- RNF-3: **Sin dependencias nuevas**: `Plus` y `X` de lucide ya existen en el proyecto; se reutilizan `VoiceDictationButton`, `haptic`, tokens de motion y el sistema de diseño vigente.
- RNF-4: **No se toca la paleta** ni se renombran tokens: se usa el sistema vigente (`primary` #059669/#10b981, `surface`, zinc, `red` para `role="alert"`).
- RNF-5: Responsive mobile (320px+); el FAB no tapa contenido al scrollear al fondo; los estados hover/active/focus del patrón home (`hover:opacity-90 active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`) se mantienen.
- RNF-6: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.
- RNF-7: Regla de proceso (`AGENTS.md`): tests automáticos por el código introducido.
- RNF-8: En jsdom `SpeechRecognition` no existe → `VoiceDictationButton` renderiza `null`; los casos de voz se testean mockeando el componente (patrón de `CreateListDialog.test.tsx`).

## Diseño técnico

### Nuevo componente `src/components/AddItemForm.tsx` (client)

Formulario de alta extraído de la página, con estados internos (no recibe estados desde la página).

- **Props**:
  - `listId: string` — id de la lista (se pasa para `addItem`).
  - `focusMode: boolean` — define la variante (foco vs normal).
  - `closing: boolean` — fase de cierre: colapsa el form y lo vuelve inerte (`aria-hidden` + `pointer-events-none`).
  - `onClose: () => void` — callback para cerrar (Escape); lo provee la página.
  - `onExited: () => void` — se dispara al terminar la transición de colapso (`transitionend`); la página usa este evento para desmontar y devolver el foco al FAB.
- **Animación (collapse)**: el contenedor envuelve al `<form>` en un wrapper con las utilidades `collapse-form` / `collapse-form-open` (`grid-template-rows: 0fr → 1fr` + fade, `--ease-out-expo`). La apertura usa una fase de entrada con `requestAnimationFrame` (el primer frame queda colapsado y recién el frame siguiente agrega `-open`, activando la transición). El cierre invierte el estado (quita `-open`) y al terminar la transición (`onTransitionEnd` con `e.target === e.currentTarget`) llama `onExited`. Respeto de `prefers-reduced-motion` mediante el bloque global que pone `transition-duration: 0.01ms`.
- **Estado interno**: `name`, `description`, `quantity` (inicia 1), `unit`, `voiceError` + `nameRef` (`useRef<HTMLInputElement>`).
- **Mount** (`useEffect` con deps `[onClose]`):
  - `nameRef.current?.focus()` → foco inicial en el input de nombre al abrir (patrón `CreateListDialog`).
  - Listener `keydown` de `document` → si `Escape`, `onClose()` (mismo patrón que `CreateListDialog`/`ConfirmDialog`).
- **`handleAdd(e)`** interno (misma lógica que hoy):
  - `preventDefault`; `if (!name.trim() || !listId) return`.
  - `useListStore.getState().addItem(listId, { name, description, quantity, unit })`.
  - `if (focusMode) haptic()` (objeto `NewItemInput`).
  - `resetForm()` interno (sete los 4 campos a valores iniciales) — el form **no se cierra solo**; el cierre lo maneja la página.
- **Render**: el JSX actual de `page.tsx` movido tal cual, con dos únicos cambios:
  - El `<form>` lleva `id="add-item-form"` y conserva `aria-label="Añadir elemento"` (referenciado por `aria-controls` del FAB).
  - Variante foco (`focusMode`): input `id="item-name-focus"` grande + `VoiceDictationButton` + botón submit "Agregar". Variante normal: `id="item-name"` + `VoiceDictationButton` + descripción + cantidad (`min=0 step="0.01"`) + unidad + botón "Añadir".
  - Solo una variante está montada a la vez; `nameRef` se asigna al input de nombre de la variante activa.
- `"use client"` en el archivo.

> **Nota**: al alternar `focusMode` con el form abierto, el estado (nombre/descripción) se conserva porque es el mismo componente (solo cambia la variante renderizada). Al cerrar y reabrir, se pierde (montaje nuevo) → el reseteo de `name`/`voiceError` al cerrar sale gratis por desmontaje.

### Refactor de `src/app/lista/[id]/page.tsx`

- **Eliminar**: estados `name`/`description`/`quantity`/`unit`/`voiceError`; `resetForm()`; `handleAdd()`; imports de `VoiceDictationButton`, `haptic`, `NewItemInput` (y de `AddItemForm` se agrega). El bloque `isSignedIn ? (focusMode ? formFoco : formNormal) : AuthGateCta` se reemplaza por un render condicional del componente.
- **Agregar**:
  - `const [addFormOpen, setAddFormOpen] = useState(false)` (estado inicial **cerrado**).
  - `const fabRef = useRef<HTMLButtonElement>(null)`.
  - `toggleForm()`: si estaba abierto → `setAddFormOpen(false)` + `fabRef.current?.focus()`; si estaba cerrado → `setAddFormOpen(true)`.
  - `closeForm()`: `setAddFormOpen(false)` + `fabRef.current?.focus()` (lo usa `<AddItemForm onClose={closeForm} />` para Escape).
  - Render del form: `{addFormOpen && <AddItemForm listId={list.id} focusMode={focusMode} onClose={closeForm} />}` dentro del bloque `isSignedIn` (posición actual, antes de `ProgressSummary`).
  - **FAB** (solo `isSignedIn`, después del contenedor, patrón del home):
    ```tsx
    <button
      type="button"
      ref={fabRef}
      onClick={toggleForm}
      aria-label={addFormOpen ? "Cerrar formulario" : "Añadir elemento"}
      aria-expanded={addFormOpen}
      aria-controls="add-item-form"
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
    >
      {addFormOpen ? <X className="h-7 w-7" aria-hidden /> : <Plus className="h-7 w-7" aria-hidden />}
    </button>
    ```
- **Layout**: el contenedor `mx-auto w-full max-w-lg flex-1 p-6` pasa a `p-6 pb-24` (anti-tapado del FAB sobre el último item, mismo criterio que el home).
- **EmptyState** (lista vacía): `description` pasa a `"Añadí el primer elemento tocando el botón +."`.
- **Mantener**: `editingId`/edición inline con `handleSaveEdit`, `shareOpen`/`AddMemberForm`, `sharedInfoOpen`/`ConfirmDialog`, `getSharedMemberEmails` effect, `hideCompleted`, `ProgressSummary`, `AuthGateCta` sin sesión, `PageTransition`, `LoadingState`, `EmptyState` de sin-pendientes.

### Tests (regla de proceso)

- **`src/components/AddItemForm.test.tsx`** (nuevo, **entra al coverage**):
  - Mock de `@/lib/stores/listStore` con el patrón de `CreateListDialog.test.tsx`/`ListCard.test.tsx` (`vi.hoisted` + `vi.mock` de `useListStore` invocando el selector sobre un `storeState` con `addItem: vi.fn()`). Mock de `VoiceDictationButton` (patrón `CreateListDialog.test.tsx`) y opcional de `@/lib/haptics`.
  - Casos: `focusMode=false` renderiza nombre + descripción + cantidad + unidad + botón "Añadir"; `focusMode=true` solo nombre + botón "Agregar"; el input de nombre tiene el foco al montar; submit con nombre vacío/solo espacios no llama `addItem`; alta completa llama `addItem` con el input y **resetea los campos quedando visible** el form; Escape llama `onClose`; error de voz (disparando `onError` del mock) muestra `role="alert"`; en modo foco al agregar llama a `haptic`.
- **`src/app/lista/[id]/page.test.tsx`** (nuevo, smoke test **funcional**, la página sigue **FUERA del coverage**):
  - Mocks: `@/lib/stores/listStore` (`useListStore` selector con lista del owner sin items y `ready: true`), `@/lib/useHydrated` → `true`, `@/lib/supabase/auth` (`useAuth` con variable mutable `status`), `@/lib/stores/preferencesStore` (`usePreferences` selector con `focusMode/hideCompleted/setters`), `@/app/supabase-actions` (`getSharedMemberEmails` → `Promise.resolve([])`), y stubs de componentes pesados (`ListOptionsMenu`, `AuthGateCta`, `PageTransition` como fragment si hace falta). `AddItemForm` se deja real para verificar el toggle de punta a punta, o se stubbea si el form real agrega fragilidad (decisión de implementación; la lógica del form se cubre en su propio test).
  - Casos: con sesión, FAB visible (`button` "Añadir elemento", `aria-expanded=false`), form **no visible**, `EmptyState` con el copy nuevo; sin sesión, FAB ausente y `AuthGateCta` visible; click en FAB abre el form (visible, el FAB pasa a `aria-label="Cerrar formulario"` / `aria-expanded=true`) y un segundo click lo cierra (form no visible, foco de vuelta al FAB); `Escape` con el form abierto lo cierra y devuelve el foco al FAB.
- **`vitest.config.ts`**: agregar `src/components/AddItemForm.tsx` al `include` de coverage; verificar que los thresholds globales (80/75) se mantienen. `src/app/lista/[id]/page.tsx` **no** se agrega al `include` (misma justificación que el home: auth/server actions/JSX pesado → mocks frágiles; su comportamiento se cubre con el smoke test).

## Criterios de aceptación

- [ ] CA-1: Dado el detalle de una lista con sesión, cuando se navega a la página, entonces el form de alta **no está visible** y aparece un **FAB** con icono `+`, `aria-label="Añadir elemento"` y `aria-expanded=false`.
- [ ] CA-2: Dado el FAB, al tocarlo, entonces el form se muestra **en su ubicación actual** (antes de `ProgressSummary`/lista), el FAB pasa a icono `X` con `aria-label="Cerrar formulario"` y `aria-expanded=true`, y el **foco está en el input de nombre**.
- [ ] CA-3: Dado el form abierto, al tocar de nuevo el FAB o presionar **Escape**, entonces el form se oculta (no se renderiza) y el **foco vuelve al FAB**.
- [ ] CA-4: Dado el form abierto, al agregar un elemento, entonces `addItem` recibe `{ name, description, quantity, unit }`, el form **se resetea pero permanece abierto** (se pueden agregar varios seguidos).
- [ ] CA-5: Dado el form abierto en modo foco, cuando se renderiza, entonces muestra la variante simplificada (input grande + "Agregar"); fuera de foco, la variante completa (descripción/cantidad/unidad + "Añadir"). Alternar `focusMode` con el form abierto cambia de variante sin perder lo escrito.
- [ ] CA-6: Dado el form cerrado, entonces `voiceError` **no se muestra**; al cerrar con el form con error, el error desaparece.
- [ ] CA-7: Dado el detalle **sin sesión**, cuando se renderiza, entonces **no** se muestra el FAB y se ve `AuthGateCta`.
- [ ] CA-8: Dado el detalle con la lista vacía, cuando se renderiza, entonces el `EmptyState` dice "Añadí el primer elemento tocando el botón +.".
- [ ] CA-9: El FAB usa `z-30` y el contenedor `pb-24`: no tapa el último elemento/item; los menús (`z-40`) y modales (`z-50`) siguen encima.
- [ ] CA-10: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas; `AddItemForm.tsx` está en el coverage y la página `[id]/page.tsx` no.
- [ ] CA-11: Sin código muerto: no quedan en `page.tsx` referencias a `handleAdd`, `resetForm`, `voiceError` ni a los estados `name`/`description`/`quantity`/`unit`.

## Tareas de implementación (derivadas)

- [ ] T-1: Crear `src/components/AddItemForm.tsx` (props `listId`/`focusMode`/`onClose`, estados internos, `handleAdd` + reset + háptica en foco, foco al montar, Escape → `onClose`, `id="add-item-form"`, variantes por `focusMode` — JSX movido de la página).
- [ ] T-2: Refactor de `src/app/lista/[id]/page.tsx` (estado `addFormOpen` cerrado, `fabRef`, `toggleForm`/`closeForm`, FAB `Plus`/`X` con `aria-label`/`aria-expanded`/`aria-controls`, render condicional de `AddItemForm`, `p-6 pb-24`, copy del `EmptyState`, borrado de estados/imports muertos).
- [ ] T-3: Crear `src/components/AddItemForm.test.tsx` (mock de `listStore` + `VoiceDictationButton`; casos de variantes, foco, alta+reset, nombre vacío, Escape, error de voz, háptica en foco).
- [ ] T-4: Crear `src/app/lista/[id]/page.test.tsx` (smoke test: FAB visible/invisible según sesión, toggle abre/cierra el form con `aria-expanded`, Escape con devolución de foco, copy del `EmptyState`), sin exponer la página al coverage.
- [ ] T-5: Actualizar `vitest.config.ts` (agregar `src/components/AddItemForm.tsx` al `include`) y verificar thresholds (80/75).
- [ ] T-6: Verificación final: `npm test`, `npm run lint`, `tsc --noEmit`, `next build` y revisión manual (toggle del FAB, agregar varios items seguidos, modo foco dentro del form abierto, dictado donde haya soporte, sin sesión, menú de opciones/compartir intacto).

## Notas / decisiones

- **Animación tipo collapse (apertura y cierre)**: tras revisar el slide-up de los modales, el usuario prefirió un efecto *collapse* sobre el contenedor del form (expandir/colapsar en altura). Se usa la técnica `grid-template-rows: 0fr → 1fr` con transición + fade, implementada como un wrapper con las utilidades `collapse-form`/`collapse-form-open` en `globals.css`. Para que se sienta suave y continua: duración unificada ~0.32s con easing `cubic-bezier(0.22, 1, 0.36, 1)`; también se animan el **padding interno** del form (la "tarjeta" se desinfla sin cortes) y el **margin-bottom** del wrapper (pasa de 0 a 1.5rem, evitando el hueco fijo o el pegamiento contra `ProgressSummary`). El slide-up sigue vivo solo para los modales; para la salida se descartó el slide-down. El cierre ya no desmonta al instante: la página orquesta `addFormOpen` (montado) + `addFormClosing` (animando salida) y `AddItemForm` avisa con `onExited` al terminar `transitionend`.
- **Entrada en dos fases**: el wrapper monta colapsado y, en el frame siguiente (`requestAnimationFrame`), agrega `collapse-form-open` para que el navegador compute el estado inicial y la transición se reproduzca. En jsdom esto no se ejecuta solo: los tests usan `waitFor` para el caso de apertura y `fireEvent.transitionEnd` para el cierre.
- **Tests del detalle con `use(params)`**: la página recibe `params` como Promise y React suspende; los smoke tests la envuelven en `<Suspense>` y usan `await act(async () => render(...))` para resolver la suspensión antes de interactuar.

- **Toggle con el mismo botón (swap de icono)**: se elige la opción más simple — un único botón FAB que alterna `Plus` ↔ `X` según el estado, en lugar de dos botones separados o un `+` rotado. El estado se anuncia con `aria-expanded` + `aria-controls` y el `aria-label` cambia según el estado ("Añadir elemento" / "Cerrar formulario"). Patrón *disclosure*, coherente con el resto de la app (p. ej. el toggle de foco usa `aria-pressed`).
- **Extracción a `AddItemForm.tsx`: sí.** Justificación: la regla de proceso (`AGENTS.md`) exige tests por el código introducido; el form es la pieza con más lógica nueva (variantes, reset, voz, foco) y hoy vive en una página que está **fuera** del coverage. Extraído, se puede testear directo con el patrón de mock ya usado (`CreateListDialog.test.tsx`) y entra al `include` de `vitest.config.ts`. No rompe el modo foco porque recibe `focusMode` como prop y mantiene el JSX actual. La página queda como orquestador y se cubre con un smoke test funcional (mismo criterio que `page.tsx` del home).
- **Desmontar = reseteo al cerrar**: el form solo se monta con `addFormOpen`; al cerrar se desmonta y `name`/`voiceError` se pierden, lo que cumple RF-8 sin lógica extra (mismo efecto que el reset al cerrar de `CreateListDialog`). Al **agregar**, el form hace reset interno pero **no** se desmonta (permanece abierto, RF-7).
- **Escape cierra: sí.** Coherente con `ConfirmDialog`/`CreateListDialog` y con la expectativa de descartar un alta en curso. El listener vive en `AddItemForm` (montado solo cuando el form está abierto) y delega en `closeForm()` de la página, que devuelve el foco al FAB.
- **Foco**: al abrir, `nameRef.focus()` en el mount del form (patrón `CreateListDialog`); al cerrar (FAB o Escape), `fabRef.current?.focus()`. Como el FAB está siempre montado (con sesión), la devolución de foco es directa.
- **`aria-controls="add-item-form"`**: referencia el `id` del `<form>`, que solo existe mientras el form está abierto (expandido). Correcto para un disclosure: cuando `aria-expanded="false"` la region no está presente en el DOM.
- **Copy del `EmptyState`**: "Añadí el primer elemento arriba." ya no aplica porque el form ya no está "arriba" siempre visible → "Añadí el primer elemento tocando el botón +.".
- **`pb-24` en el detalle** (no `pr-24`): el flujo es una columna vertical y el último contenido (items/`EmptyState`) ocupa el ancho; padding-bottom es el método más simple, mismo criterio que el home. No modifica colores ni tokens.
- **FAB solo con sesión**: sin sesión ya se muestra `AuthGateCta`; un FAB invisible para invitados evita estados muertos (idéntico a `fab-crear-lista.md`).
- **Z-index**: `z-30` (FAB) < `z-40` (menús) < `z-50` (modales), sin cambios.
- **Coverage**: `AddItemForm.tsx` sí entra al `include`; `src/app/lista/[id]/page.tsx` **se mantiene fuera** (espiga auth/server actions/DnD → mocks frágiles; su comportamiento nuevo se cubre con el smoke test). Regla de proceso de `AGENTS.md` cumplida.