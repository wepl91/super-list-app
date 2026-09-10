# Escáner de códigos de barras para agregar elementos de lista

**Estado**: `implemented`
**Versión**: v3
**Fecha**: 2026-09-09

## Contexto / Objetivo

En el **detalle de lista** (`src/app/lista/[id]/page.tsx`), el form colapsable
`AddItemForm` permite cargar un elemento tecleando (o dictando con el micrófono).
Se quiere un **botón de escáner** junto al input: al apuntar la cámara a un
código de barras (EAN/UPC, Code 128, Codabar, etc.) el nombre se completa en el
campo (o, si el código ya fue "aprendido", se reutiliza su nombre). Es una
mejora de velocidad y accesibilidad típica del flujo de compra, alineada con el
dictado por voz ya implementado.

## Viabilidad técnica

Se usa la **API nativa `BarcodeDetector`** (Chromium: Chrome Android/Desktop,
Edge; **no** Safari ni Firefox):

- **Contexto seguro requerido**: HTTPS — ya tenemos HTTPS en Vercel.
- **Feature detection**: `"BarcodeDetector" in window` + `BarcodeDetector.getSupportedFormats()`
  (enviro con try/catch: algunos navegadores la tienen pero lanzan). Si no existe
  (Safari, Firefox), el botón **no se renderiza** (mismo patrón que el micrófono).
- **Formats**: depende del navegador; en Chrome Android suele incluir
  `ean_13`, `ean_8`, `upc_a`, `upc_e`, `code_128`, `code_39`, `code_93`,
  `codabar`, `itf`, `qr_code`, `data_matrix`, `pdf417`. Se escanea lo que el
  navegador soporte (`getSupportedFormats`); no filtramos por formato salvo para
  info/debug.
- **Cámara**: `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`
  (cámara trasera). El permiso lo pide el navegador **una sola vez** (prompt);
  si se deniega → aviso corto `role="alert"`, sin romper el form.
- **Detección**: bucle con `requestAnimationFrame`; se llama a
  `detector.detect(video)` solo cuando `video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA`
  (evita `TypeError`/`NotSupportedError` con el frame vacío). La API devuelve
  `rawValue`, **sin nombre comercial** → de ahí el mapa local `código → nombre`.
- **Privacidad/offline**: sin grabación, sin envío de imágenes ni llamadas a
  servicios externos (se descartan APIs de pago de productos). Todo el
  procesamiento es local (bucle detect + música del dispositivo).
- **No aplica** nuevas dependencias ni costos.

## Requisitos funcionales

- [x] RF-1: Botón **escáner** (`ScanBarcode`) junto al input de "agregar elemento",
  en el detalle de lista, en **modo normal y modo foco** (junto a
  `VoiceDictationButton`).
- [x] RF-2: Al tocarlo, se abre un **overlay con la cámara** (`<video autoplay muted playsinline>`)
  y un aviso "Apuntá a un código de barras". Botón/borde de **cerrar** visible
  (`Escape` y click en cerrar cierran el overlay).
- [x] RF-3: Al detectar un código:
  - Si el código tiene **nombre conocido** en el mapa local → se completa `setName(nombre)`.
  - Si **no**, se consulta **Open Food Facts**
    (`world.openfoodfacts.org/api/v2/product/{code}.json`): mientras busca se
    muestra un **loader** ("Buscando producto…").
    - Si el lookup **resuelve** y el campo sigue vacío → se completa con el
      nombre y se cachea en el mapa local (si el usuario ya escribió/dictó, se
      respeta su texto).
    - Si el lookup **falla o no lo encuentra** → el campo queda **vacío** (para
      cargar a mano o por voz) y se muestra un **snackbar rojo**
      ("No se pudo encontrar el producto.").
  - El overlay se cierra tras la primera detección exitosa (con cooldown para no
    re-detectar el mismo código en el mismo frame/segundo).
- [x] RF-4: **No auto-agrega** el elemento: el nombre queda en el campo listo para
  confirmar con "Agregar" (consistente con el dictado por voz — ver Notas).
- [x] RF-5: **Aprendizaje**: si el item se agrega con un nombre final distinto del
  código cruto (usuario lo renombró), se guarda el mapeo `código → nombre` en el
  mapa local. La segunda vez que se escanee el mismo código se completa solo.
- [x] RF-6: **Feature detection**: si `BarcodeDetector` no existe (Safari/Firefox),
  el botón no se renderiza y el resto de la UI funciona igual.
- [x] RF-7: Estados visibles: escáner cerrado / abriendo cámara ("Abriendo cámara…") /
  escaneando / **error de permiso** ("Necesito permiso para usar la cámara.") y
  error de cámara ausente (aviso corto `role="alert"`, same estilo que `voiceError`).
- [x] RF-8: Al cerrar/desmontar el overlay se **detiene el stream** de cámara
  (`stream.getTracks().forEach(t => t.stop())`) y se cancela el bucle rAF (sin leaks).

## Requisitos no funcionales

- RNF-1: Sin dependencias nuevas; API nativa del navegador (`BarcodeDetector` +
  `getUserMedia`).
- RNF-2: Todo **local-first y offline**: el mapa `código → nombre` se persiste en
  localStorage (patrón zustand `persist` del proyecto) y **no se sincroniza**
  entre cuentas/dispositivos.
- RNF-2b (v2): el **lookup online** solo ocurre cuando el código es desconocido
  localmente y no hay nombre en cache; el resultado se guarda en el mapa local.
  Ante fallo de red/HTTP o producto inexistente, el flujo continúa con el código
  cruto (offline-first, sin romper). Sin API key ni costo.
- RNF-3: `npm test`, `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-4: Cobertura: los archivos nuevos entran al `include` de `vitest.config.ts`
  y cada uno tiene su test (regla de `specs/test-coverage.md`).
- RNF-5: Accesible: botón con `aria-label` (`aria-pressed` cuando escaneando),
  overlay con `role="dialog"`, `aria-modal`, foco en el botón cerrar, avisos con
  `role="alert"`. Textos en español.
- RNF-6: Sin grabación ni envío de imágenes a la red; el stream vive solo en
  memoria mientras el overlay está abierto.

## Diseño técnico

### Archivos nuevos

- **`src/lib/barcodes.ts`** — utilidades **puras** (testeables sin DOM):
  - `normalizeBarcode(raw: string): string` — `trim()` + colapso de espacios.
  - `isRawBarcode(name: string, code: string): boolean` — dice si el nombre del
    campo sigue siendo el código cruto (normalizado) y por lo tanto conviene
    persistir el mapeo al agregar.
  - Type `BarcodeFormat = string` (delegamos en `getSupportedFormats`).
- **`src/lib/stores/barcodeStore.ts`** — store zustand persistente del mapa:
  - `name: "super-list-barcodes"` (localStorage, offline).
  - Shape: `{ codes: Record<string, string> }` con selectores/actions
    `getBarcodeName(code)`, `setBarcodeName(code, name)`.
  - **Cap** de ~2000 entradas con evicción FIFO (preservando el orden de
    inserción de las string keys de JS) para no tocar `QuotaExceededError`.
- **`src/lib/useBarcodeScanner.ts`** — hook client (patrón `useScreenWakeLock` +
  `VoiceDictationButton`):
  - Feature detection al montar (`supported`, con `getSupportedFormats` en try/catch).
  - `open()/close()`: `getUserMedia({ video: { facingMode: "environment" } })`
    (con `audio: false`), monta el `<video>` en un ref, inicia el bucle rAF,
    y en cleanup detiene tracks + cancela rAF.
  - Bucle rAF: `video.readyState >= HAVE_CURRENT_DATA` → `detector.detect(video)`;
    primer `detectedBarcode.rawValue` no vacío → `onDetect(rawValue)`; **cooldown**
    de ~2 s por el mismo código para no re-detonar en el mismo frame.
  - Devuelve `{ supported, open, close, error, videoRef }` con estados
    `"idle" | "opening" | "scanning"` y `error: string | null`.
- **`src/components/BarcodeScannerButton.tsx`** — botón + overlay (patrón
  `VoiceDictationButton`):
  - `render null` si `!supported` (Safari/Firefox: UI degradada sin romper).
  - Botón `type="button"` con icono `ScanBarcode`, `aria-label` "Escanear código
    de barras", `aria-pressed` mientras el overlay está abierto.
  - Overlay con `<video>`, label "Apuntá a un código de barras", botón "Cerrar",
    aviso `role="alert"` ante error de permiso/cámara.
  - Prop `onDetect(rawValue: string)` y `onError(msg)`.

### Integración

- **`src/components/AddItemForm.tsx`** (modo normal y modo foco, junto a
  `VoiceDictationButton`):
  - Estado `lastScannedCode: string | null`.
  - `handleDetected(code)`: `setName(barcodeStore.getState().getBarcodeName(code) ?? code)`;
    guarda `lastScannedCode = code` (se limpia en `resetForm`). Si el código es
    desconocido, dispara `lookupProductName(code)` (Open Food Facts): al
    resolver, completa el campo solo si sigue siendo el código cruto y persiste
    el mapeo en `barcodeStore`.
  - En `handleAdd`: antes de `addItem`, si `lastScannedCode` existe y
    `isRawBarcode(name, lastScannedCode)` es false (el usuario puso/renombró un
    nombre de producto), `setBarcodeName(lastScannedCode, name.trim())`.
  - El overlay se cierra dentro de `BarcodeScannerButton` tras detectar (los
    errores se muestran igual que `voiceError`, abajo del form).
- **`src/lib/barcodeLookup.ts`** (nuevo, v2): `lookupProductName(code, fetcher?, timeout?)`
  — consulta `world.openfoodfacts.org/api/v2/product/{code}.json` con timeout y
  `AbortController`; devuelve el nombre (con fallback a `product_name_es`,
  `generic_name`) o `null` ante cualquier fallo. Inyectable para testear.
- **`vitest.config.ts`**: agregar al `include` de coverage:
  `src/lib/barcodes.ts`, `src/lib/stores/barcodeStore.ts`,
  `src/lib/useBarcodeScanner.ts`, `src/components/BarcodeScannerButton.tsx`.

### Flujo de datos (secuencia)

1. Usuario toca el botón escáner → overlay + `getUserMedia` (prompt de permiso la
   primera vez).
2. Bucle rAF detecta `rawValue` → el botón invoca `onDetect` → `AddItemForm`
   completa el input (nombre conocido o código cruto) y cierra el overlay.
3. Usuario edita el nombre si hace falta y confirma "Agregar" → si el nombre
   final es un producto, se persiste `código → nombre`.
4. Siguiente vez: el mismo código se autocompleta con el nombre aprendido.

## Criterios de aceptación

- [x] CA-1: Dado un navegador Chromium con cámara, cuando toco el botón escáner y
  apunto a un código de barras, entonces el input "Nombre del elemento" se
  completa (nombre conocido o código cruto) y el overlay se cierra.
- [x] CA-2: Dado un código sin nombre conocido, cuando agrego el item con un
  nombre editado (distinto del código), entonces el mapeo `código → nombre`
  queda persistido y un segundo escaneo del mismo código autocompleta el nombre.
- [x] CA-3: Dado Safari o Firefox (sin `BarcodeDetector`), cuando se renderiza el
  form, el botón de escáner **no aparece** y el resto del form funciona igual.
- [x] CA-4: Dada una denegación de permiso de cámara, cuando abro el escáner,
  entonces se muestra un aviso corto con `role="alert"` ("Necesito permiso para
  usar la cámara.") y el form sigue usable.
- [x] CA-5: Dado un overlay abierto, cuando lo cierro (botón cerrar o `Escape`) o
  se desmonta el form, entonces el stream de cámara se detiene (sin leaks) y no
  hay rAF pendientes.
- [x] CA-6: `npm test`, `npm run test:coverage` (≥80% líneas / ≥75% ramas),
  `npm run lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: `src/lib/barcodes.ts` (utils puras) + `src/lib/barcodes.test.ts`.
- [x] T-2: `src/lib/stores/barcodeStore.ts` (zustand persist + cap)
  + `src/lib/stores/barcodeStore.test.ts`.
- [x] T-3: `src/lib/useBarcodeScanner.ts` (feature detection, getUserMedia, bucle
  rAF con cooldown, cleanup) + `src/lib/useBarcodeScanner.test.tsx`.
- [x] T-4: `src/components/BarcodeScannerButton.tsx` (botón + overlay + estados +
  `role="alert"`/`dialog`) + `src/components/BarcodeScannerButton.test.tsx`.
- [x] T-5: Integración en `AddItemForm` (ambos modos, `lastScannedCode`,
  guardado del mapeo al agregar) + extender `AddItemForm.test.tsx`.
- [x] T-6: Agregar los 4 archivos al `include` de `vitest.config.ts`.
- [x] T-7: Verificar `npm test`/`test:coverage`, `lint`, `tsc --noEmit`, `next build`.
- [x] T-8 (v2): `src/lib/barcodeLookup.ts` + test (Open Food Facts, timeout,
  fallback de campos, `null` ante fallos) e incluirla en coverage.
- [x] T-9 (v2): Integrar el lookup en `AddItemForm.handleDetected` (cache,
  respeto a la edición del usuario) + tests (lookup OK cachea, lookup no pisa
  la edición).
- [x] T-10 (v3): Lookup fallido → **snackbar rojo** y campo vacío (se carga a
  mano o por voz); **loader** mientras se procesa; los dos con tests
  (snackbar, campo vacío, loader visible/invisible, nombre aprendido gana).

## Notas / decisiones

- **No auto-agregar**: igual que en `dictado-por-voz` (RF-3/Nota "No auto-envía
  el formulario"), el escaneo **completa el campo** y el usuario confirma con
  "Agregar". Evita elementos duplicados/no deseados y da lugar al renombrado
  cuando el nombre no es conocido. *Validado con el dueño: siempre completa el
  campo y listo (no hay modo de auto-agregar).*
- **Aprendizaje del mapeo**: el mapa se guarda **solo localmente** (no se
  sincroniza entre cuentas/dispositivos) por diseño local-first/offline; un
  futuro spec podría sincronizarlo a Supabase si el dueño lo pide.
- **No se envía nada a la red mientras se escanea**: el vídeo vive en memoria;
  la cámara se libera al cerrar. La única llamada de red es el **lookup opcional
  de Open Food Facts** (API libre, sin key, buena cobertura EAN/UPC) para
  códigos desconocidos; se cachea el resultado en local. El lookup no pisa una
  edición del usuario (si el campo ya no es el código cruto, se ignora).
- **`BarcodeDetector` es experimental/Chromium-only**: en Chrome desktop el
  formulario puede requerir flag según versión; el usuario probado es Chrome
  Android, donde funciona sin configuración. Safari/Firefox quedan con la UI
  degradada (sin botón).
- **Icono**: `ScanBarcode` de lucide-react (verificado en la versión instalada).
- **Formato de persistencia**: `Record<string, string>` en localStorage
  (`super-list-barcodes`), con cap FIFO de ~2000 entradas para no exceder la
  cuota (los códigos de producto son cadenas cortas).