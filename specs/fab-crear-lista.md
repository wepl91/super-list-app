# FAB de "crear lista" + modal de creación (home)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-09

## Contexto / Objetivo

El **home** (`src/app/page.tsx`) expone hoy un **formulario de creación siempre visible** (input "Nueva lista..." + dictado por voz + botón "Crear"). Ese formulario ocupa espacio vertical permanente y compite con las `ListCard` y el `EmptyState`.

Objetivo: **limpiar la jerarquía visual del home** reemplazando el form siempre visible por un **botón flotante (FAB)** con icono `+` que abre un **modal** para cargar el nombre de la lista y/o **dictarlo por voz** (reutilizando `VoiceDictationButton`). Se mantiene el comportamiento existente: creación sin sesión bloqueada, flash/highlight de la card nueva, dictado sin auto-envío.

Consume las primitivas y decisiones de los specs previos: `dictado-por-voz.md` (VoiceDictationButton, no auto-envío) y `ux-home-navegacion.md` (EmptyState con CTA, flash de creación).

## Requisitos funcionales

- [ ] RF-1: El home ya **no muestra** el input/form de crear lista siempre visible.
- [ ] RF-2: Un **FAB** con icono `+` (lucide `Plus`) y `aria-label="Crear lista"` permite abrir el modal de creación.
- [ ] RF-3: El FAB se renderiza **solo si `isSignedIn`**; sin sesión se mantiene el flujo actual (`AuthGateCta`).
- [ ] RF-4: Al tocar el FAB se abre el **modal** `CreateListDialog` con el foco inicial en el input de nombre.
- [ ] RF-5: El modal permite cargar el nombre **por teclado** y/o **dictarlo por voz** (reusando `VoiceDictationButton`); el dictado **no auto-envía** el formulario: el usuario confirma con el botón "Crear".
- [ ] RF-6: Al confirmar, se llama `createList(name.trim())`; si devuelve un id, el modal se cierra y el id nuevo recibe el **flash/highlight** en el home (`flashList`).
- [ ] RF-7: El botón "Crear" está **deshabilitado** mientras el nombre está vacío.
- [ ] RF-8: **Escape** y **click en el backdrop** cierran el modal; al cerrar, se resetean el nombre y los errores.
- [ ] RF-9: Los errores de dictado (permiso/captura) se muestran con `role="alert"` **dentro del modal**.
- [ ] RF-10: El CTA del `EmptyState` ("Crear la primera lista") abre el modal en lugar de enfocar el input viejo; el copy "…arriba" se ajusta porque ya no aplica.
- [ ] RF-11: Queda **todo el código muerto eliminado** de `page.tsx` (form viejo, `newName`, `voiceError`, `newListInputRef`, `focusNewList`, `handleCreate`, imports sin uso).

## Requisitos no funcionales

- RNF-1: **Accesibilidad**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; Escape cierra; foco inicial al input; devolución de foco al FAB al cerrar (documentada como bueno-tener, ver Notas).
- RNF-2: **Sin dependencias nuevas**: lucide `Plus` ya existe; se reutilizan `VoiceDictationButton`, `haptics`, tokens de motion y clases del sistema de diseño vigente.
- RNF-3: **No se toca la paleta** ni se renombran tokens: se usa el sistema vigente (`primary` #059669/#10b981, tokens `surface`/`background`/`foreground`/`text-secondary`/`placeholder`, clases zinc tipo `border-zinc-300 dark:border-zinc-700`, `hover:bg-zinc-100 dark:hover:bg-zinc-800`, `bg-black/40`, `bg-red-600`).
- RNF-4: **Z-index**: el FAB usa `z-30`, por debajo de modales (`z-50` en `ConfirmDialog`) y menús (`z-40`), para que nunca tape overlays.
- RNF-5: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.
- RNF-6: Responsive mobile (320px+); el FAB no tapa el contenido inferior del home (el `InstallPrompt` que vive al final de la página).
- RNF-7: Regla de proceso (`AGENTS.md`): tests automáticos por el código introducido.

## Diseño técnico

### FAB (`src/app/page.tsx`)

- Renderizado solo si `isSignedIn`, como botón `fixed`:
  - `fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-primary text-white shadow-lg`
  - Hover/active: `hover:opacity-90 active:scale-95`
  - Focus: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none` (coherente con `btn-base`)
  - `aria-label="Crear lista"`, icono `Plus` de lucide con `aria-hidden`.
- **Espaciado anti-tapado**: se agrega `pb-24` al contenedor principal del home (`mx-auto w-full max-w-lg flex-1 p-6` → `p-6 pb-24`). Razón: el contenido del home es una **columna vertical** y `InstallPrompt` ocupa el ancho al final; un `pr-24` no lo despejaría. Es un cambio de layout, no de colores/tokens.

### Nuevo componente `src/components/CreateListDialog.tsx` (client)

- Props: `open: boolean`, `onClose: () => void`, `onCreated: (id: string) => void`. Usa `useListStore((s) => s.createList)`.
- Patrón de **modal** igual a `ConfirmDialog.tsx`:
  - Backdrop `absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm` con `onClick={onClose}` y `aria-hidden`.
  - Panel `relative w-full max-w-sm animate-slide-up rounded-2xl border border-zinc-200 bg-background p-5 shadow-xl dark:border-zinc-700`, contenedor `fixed inset-0 z-50 flex items-center justify-center p-4`.
  - `role="dialog" aria-modal="true" aria-labelledby="create-list-title"`, título **"Nueva lista"**.
  - Escape cierra (listener `keydown` en un `useEffect` activo solo con `open`).
  - Foco inicial al input (`ref` + `focus()` al abrir); devolución de foco al FAB como bueno-tener.
- Contenido:
  - `<form onSubmit={handleSubmit}>` con input (`label sr-only "Nombre de la lista"`, `placeholder="Nombre de la lista"`, `autoFocus` o ref-focus, `className` igual al input actual de `page.tsx`).
  - `VoiceDictationButton` con `onInterim={setName}`, `onFinal={setName}`, `onError={setVoiceError}` (estados locales `name` y `voiceError`).
  - Error de voz dentro del modal: `<p role="alert">` con el mismo estilo que el actual (`border-red-200 bg-red-50 … dark:border-red-900 dark:bg-red-950`).
  - Botón submit "Crear" (`bg-primary … hover:opacity-90`), `disabled={!name.trim()}`.
- Submit: `const id = createList(name.trim())`; si `id` → `haptic(Haptics.success)`, `onCreated(id)`, `onClose()`. Al cerrar (Escape/backdrop/éxito) se resetean `name` y `voiceError`.
- El micrófono es `type="button"`: el dictado completa el input y **no** envía el form (consistente con `dictado-por-voz.md`).
- `"use client"` en el archivo.

### Refactor de Home (`src/app/page.tsx`)

- **Eliminar**: el `<form aria-label="Crear lista">`, `newName`, `voiceError`, `newListInputRef`, `focusNewList()`, `handleCreate()`, el `useListStore((s) => s.createList)` y el import de `VoiceDictationButton` (ya no se usa en la página).
- **Agregar**: estado `createOpen`, bloque del FAB (`isSignedIn`), y `<CreateListDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={flashList} />` al final del árbol.
- **Mantener**: `flashList`, `highlightedId`, `highlightTimer` (los consume `ListCard` en el clonado/creación), `ShoppingBasket` en el `EmptyState`, `PageTransition`.
- **EmptyState**: `description` pasa de "Aún no tenés listas. Creá la primera arriba." a "Aún no tenés listas. Tocá el botón + para crear la primera." y `action` pasa a `onClick={() => setCreateOpen(true)}` (mismas clases `btn-base btn-primary`).

### Tests (regla de proceso)

- **`src/components/CreateListDialog.test.tsx`** (nuevo):
  - Mockear `@/lib/stores/listStore` con el **mismo patrón que `ListCard.test.tsx`** (`vi.hoisted` + `vi.mock` de `useListStore` invocando el selector sobre un `storeState` con `createList: vi.fn()`).
  - Casos: no renderiza si `open=false`; al abrir, el input tiene el foco; escribir + submit llama `createList` con el texto recortado y `onCreated` con el id y cierra; el botón "Crear" está deshabilitado con nombre vacío; Escape cierra; click en backdrop cierra; al cerrar se resetea el nombre.
  - **Nota jsdom**: `SpeechRecognition` no existe → `VoiceDictationButton` renderiza `null` (no rompe el test). El caso de `role="alert"` por error de voz se cubre mockeando `VoiceDictationButton` (mismo patrón que `ListCard.test.tsx` usa para `AddMemberForm`) y disparando `onError` manualmente.
- **`vitest.config.ts`**: agregar `src/components/CreateListDialog.tsx` al `include` de coverage y verificar que los thresholds globales (80/75) se mantienen; ajustar solo si el reporte lo exige y sin exponer `page.tsx` (ver Notas).
- **Smoke test de Home** (`src/app/page.test.tsx`, bueno-tener incluido como tarea): mockear `listStore` + `useAuth` como `ListCard.test.tsx`; verifica FAB visible con sesión, ausente sin sesión, y click en FAB abre el dialog. Funcional, **no** expone `page.tsx` al coverage.

## Criterios de aceptación

- [ ] CA-1: Dado el home con sesión, cuando se renderiza, entonces el input de creación ya **no está visible** y aparece un **FAB** con icono `+` y `aria-label="Crear lista"`.
- [ ] CA-2: Dado el FAB, al hacer click, entonces se abre el modal (`role="dialog"` nombrado "Nueva lista") con el foco en el input; **Escape** y **backdrop** lo cierran; al cerrar se devuelve el foco al FAB (si se implementa el bueno-tener).
- [ ] CA-3: Dado el modal, al escribir un nombre y confirmar con "Crear", entonces `createList` se llama con el texto recortado, el modal se cierra y el id nuevo recibe el **flash/highlight** en el home.
- [ ] CA-4: Dado el modal con nombre vacío, entonces el botón "Crear" está deshabilitado y el submit no crea nada.
- [ ] CA-5: Dado el modal con soporte Web Speech API, al dictar, entonces el nombre se completa en el input y el usuario confirma con "Crear" (**sin auto-envío**); ante error de permiso/captura se muestra un `role="alert"` dentro del modal.
- [ ] CA-6: Dado el home **sin sesión**, cuando se renderiza, entonces **no** se muestra el FAB y se ve `AuthGateCta` (comportamiento actual preservado).
- [ ] CA-7: Dado el home con listas, cuando se crea desde el FAB, entonces el contenido inferior (p.ej. `InstallPrompt`) no queda tapado por el FAB (`pb-24`).
- [ ] CA-8: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan; coverage global ≥80% líneas / ≥75% ramas.
- [ ] CA-9: Sin código muerto: no quedan referencias a `newName`, `voiceError`, `newListInputRef`, `focusNewList` ni al `<form aria-label="Crear lista">` en `page.tsx`.

## Tareas de implementación (derivadas)

- [ ] T-1: Crear `src/components/CreateListDialog.tsx` (patrón modal de `ConfirmDialog` + `VoiceDictationButton` + `haptic(Haptics.success)`).
- [ ] T-2: Crear `src/components/CreateListDialog.test.tsx` (mock de `listStore` tipo `ListCard.test.tsx`).
- [ ] T-3: Actualizar `vitest.config.ts` (agregar `CreateListDialog.tsx` al `include` de coverage) y verificar thresholds.
- [ ] T-4: Refactor de `src/app/page.tsx` (quitar form viejo/estados/refs, agregar FAB + estado `createOpen` + `pb-24`, EmptyState abre el modal, ajuste de copy, render del dialog con `onCreated={flashList}`).
- [ ] T-5: Smoke test de Home (`FAB` visible/oculto según sesión y apertura del modal), sin exponer `page.tsx` en el coverage.
- [ ] T-6: Verificación final: `npm test`, `npm run lint`, `tsc --noEmit`, `next build` y revisión manual (home con/sin listas, modal, dictado donde haya soporte, sin sesión).

## Notas / decisiones

- **Sin auto-envío al dictar**: consistente con `dictado-por-voz.md`. El dictado (resultados interinos/finales) completa el input; el usuario confirma con "Crear". El micrófono es `type="button"` y no dispara el submit.
- **FAB solo con sesión**: sin sesión ya se muestra `AuthGateCta` y la UI bloquea la creación (`if (!isSignedIn) return` en el flujo actual); un FAB invisible para invitados evita estados muertos.
- **Título del modal: "Nueva lista"**: consistencia de roles — el FAB y el botón de envío se llaman "Crear lista"/"Crear" (acción), el título nombra la entidad.
- **Devolución de foco al FAB al cerrar**: bueno-tener. Se implementa guardando la `ref` del FAB y llamando `focus()` al cerrar si resulta simple; si agrega complejidad, queda registrada como mejora de accesibilidad (no bloquea).
- **Padding anti-tapado: `pb-24`** (no `pr-24`): el flujo del home es una columna vertical y `InstallPrompt` ocupa el ancho al final; subir el contenido inferior con padding-bottom es la opción más simple. No modifica colores ni tokens.
- **Háptica al crear: sí**, `haptic(Haptics.success)`. Justificación: `haptic` ya es no-op seguro (try/catch sobre `navigator.vibrate`, sin soporte en iOS), está en el stack (modo foco) y da feedback táctil de confirmación sin costo ni dependencias nuevas.
- **Coverage**: `CreateListDialog.tsx` **sí** entra al `include` (mismo patrón de mock que `ListCard.test.tsx`). `page.tsx` **se mantiene fuera** del `include`: no está expuesto hoy y agregarlo arrastraría DnD/auth/server actions al reporte con mocks frágiles; su comportamiento nuevo (FAB + apertura) se cubre con un smoke test funcional. Regla de proceso de `AGENTS.md` cumplida.
- **jsdom y voz**: sin `SpeechRecognition`, `VoiceDictationButton` renderiza `null`; los casos de voz se testean mockeando el componente (patrón del mock de `AddMemberForm` en `ListCard.test.tsx`).
- **Paleta y tokens**: el spec no toca colores ni renombra tokens; usa el sistema de diseño vigente (verde esmeralda `primary`, superficies zinc, tokens de tipografía/placeholder).