# Install Prompt funcional (Card de instalación PWA)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Super List es una PWA instalable. Actualmente el componente `src/components/InstallPrompt.tsx` muestra una card informativa estática en el Home, sin ninguna interacción: el usuario lee el texto pero no hay botón de instalación ni guía interactiva. Esto reduce significativamente la tasa de instalación de la PWA.

Este spec convierte la card en un **componente funcional de instalación** que:

- **En Android/Chrome** (desktop y mobile): captura el evento `beforeinstallprompt` del navegador y ofrece un botón que dispara el diálogo de instalación nativo.
- **En iOS** (iPhone/iPad): como no existe `beforeinstallprompt`, muestra un paso a paso claro con acciones interactivas (copiar link al portapapeles) para guiar al usuario en la instalación manual (Compartir → Añadir a pantalla de inicio).
- **En standalone** (ya instalado): no se muestra la card.

El componente ya existe en `src/components/InstallPrompt.tsx` y se usa en `src/app/page.tsx` línea 139. El spec reemplaza la implementación actual manteniendo la misma interfaz de uso.

## Requisitos funcionales

- [ ] RF-1: La card **no se muestra** cuando la app ya está en modo standalone (ya instalada).
- [ ] RF-2: La card **no se muestra** durante SSR ni antes de la hidratación (usa `useHydrated` existente).
- [ ] RF-3: En **Android/Chrome**, al cargarse el componente se escucha el evento `beforeinstallprompt`. Si se captura, se muestra un botón "Instalar app". Al tocar el botón se llama a `event.prompt()` y, tras la instalación exitosa (`event.outcome === "accepted"`), se oculta la card.
- [ ] RF-4: En **Android/Chrome**, si el evento `beforeinstallprompt` no se captura (navegador no soporta, o la app ya está instalada), se muestra la card con un botón alternativo "Copiar link" que copia la URL actual al portapapeles.
- [ ] RF-5: En **iOS**, se muestra un paso a paso claro con instrucciones: "Toca el botón de Compartir (□↑) y seleccioná 'Añadir a pantalla de inicio'". Incluye un botón "Copiar link" que copia la URL actual al portapapeles como ayuda.
- [ ] RF-6: En **otros navegadores desktop** (Firefox, Safari desktop, etc.) que no soportan `beforeinstallprompt`, se muestra la card con el botón "Copiar link" y un texto genérico indicando que la app es instalable desde el navegador.
- [ ] RF-7: El botón "Copiar link" muestra feedback visual temporizado (p. ej. "¡Copiado!") durante ~2 segundos tras copiar, y luego vuelve a su estado original.
- [ ] RF-8: Todo el copy (textos, instrucciones, botones) está en **español** (Argentina), consistente con el tono del resto de la app.

## Requisitos no funcionales

- RNF-1: **Sin romper SSR/hydration**: el componente es `"use client"` y debe seguir usando `useHydrated` para evitar diferencias server/client. Toda lógica de `window`/`navigator` se ejecuta solo post-hidratación.
- RNF-2: **Manejo limpio de `beforeinstallprompt`**: el listener se registra al montar y se limpia al desmontar (no memory leaks). Se llama `preventDefault()` en el evento para suprimir el mini-infobar del navegador.
- RNF-3: **Accesibilidad**: el botón de instalación es un `<button>` nativo con labels descriptivos. Los pasos de iOS son una lista semántica (`<ol>`).
- RNF-4: **Performante**: no se hacen fetches ni se cargan librerías adicionales. El componente pesa lo mismo o menos que la versión actual.

## Diseño técnico

- **Componente**: `src/components/InstallPrompt.tsx` (modificación del existente, no se crea archivo nuevo).
- **Estado interno** (sin store externo, es estado local del componente):
  - `deferredPrompt: BeforeInstallPromptEvent | null` — el evento capturado de `beforeinstallprompt`.
  - `canInstall: boolean` — `true` cuando se capturó el evento (Android/Chrome con prompt disponible).
  - `copied: boolean` — estado temporizado del feedback "¡Copiado!".
  - `isIOS: boolean` — detección de iOS (ya existe, se mantiene).
  - `isStandalone: boolean` — detección de standalone (ya existe, se mantiene).
- **Tipo auxiliar**: se define `BeforeInstallPromptEvent` como extensión de `Event` con las propiedades `prompt()` y `outcome` (tipo `Promise<{ outcome: "accepted" | "dismissed" }>`). Se declara a nivel de módulo en el mismo archivo (no en `types.ts` global, ya que es específico de este componente).
- **Flujo Android/Chrome**:
  1. Al montar: `window.addEventListener("beforeinstallprompt", handler)`.
  2. En el handler: `e.preventDefault()`, se guarda el evento en estado, se setea `canInstall = true`.
  3. Al tocar "Instalar app": `deferredPrompt.prompt()`, se espera `deferredPrompt.userChoice`, si `outcome === "accepted"` se oculta la card.
  4. Al desmontar: `removeEventListener`.
- **Flujo iOS**: se detecta por user agent (regex existente). Se muestra un `<ol>` con los pasos y un botón "Copiar link".
- **Flujo fallback** (otros navegadores): se muestra la card con texto genérico y botón "Copiar link".
- **Copiar link**: `navigator.clipboard.writeText(window.location.href)` con manejo de error (silencioso, fallback a no-op si no hay permiso). Se activa `copied = true`, se hace `setTimeout` de 2000ms para resetear.
- **Copy en español (es-AR)**:
  - Título: "Instalá Super List"
  - Subtítulo (Android): "Añadila a tu pantalla para abrirla al toque."
  - Botón Android: "Instalar app"
  - Subtítulo iOS: "Seguí estos pasos para añadirla a tu pantalla de inicio."
  - Pasos iOS:
    1. "Tocá el botón de **Compartir** (□↑) en la barra de abajo."
    2. "Seleccioná **Añadir a pantalla de inicio**."
    3. "Tocá **Añadir** para confirmar."
  - Botón copiar (iOS y fallback): "Copiar link"
  - Feedback copiado: "¡Copiado!"
  - Texto fallback: "Abrí esta URL en Chrome o Edge para instalarla como app."

## Criterios de aceptación

- [ ] CA-1: Dado un usuario en Android con Chrome, cuando abre el Home, entonces la card muestra un botón "Instalar app" (asumiendo que Chrome emite `beforeinstallprompt`).
- [ ] CA-2: Dado un usuario en Android/Chrome que toca "Instalar app", cuando confirma la instalación, entonces el navegador muestra el diálogo nativo y, tras aceptar, la card se oculta.
- [ ] CA-3: Dado un usuario en iPhone/iPad, cuando abre el Home, entonces la card muestra un paso a paso con las instrucciones de instalación manual y un botón "Copiar link".
- [ ] CA-4: Dado un usuario en iOS que toca "Copiar link", cuando toca el botón, entonces la URL se copia al portapapeles y se muestra "¡Copiado!" durante ~2 segundos.
- [ ] CA-5: Dado un usuario en Firefox desktop u otro navegador sin `beforeinstallprompt`, cuando abre el Home, entonces la card muestra un texto genérico y un botón "Copiar link".
- [ ] CA-6: Dado que la app está en modo standalone (ya instalada), cuando se carga el Home, entonces la card NO se muestra.
- [ ] CA-7: Dado que se navega al Home desde el servidor (SSR), cuando se hidrata el componente, entonces no hay errores ni parpadeos (el componente es `null` hasta post-hidratación).
- [ ] CA-8: Dado que se desmonta el componente (navegación a otra ruta), cuando se desmonta, entonces se limpia el listener de `beforeinstallprompt` (sin memory leaks).

## Tareas de implementación (derivadas)

- [ ] T-1: Definir el tipo `BeforeInstallPromptEvent` (extensión de `Event` con `prompt()` y `outcome`) a nivel de módulo en `src/components/InstallPrompt.tsx`.
- [ ] T-2: Implementar el `useEffect` que escucha `beforeinstallprompt`, llama a `preventDefault()` y guarda el evento en estado.
- [ ] T-3: Implementar el handler `handleInstall` que llama a `deferredPrompt.prompt()`, espera `userChoice`, y oculta la card tras instalación exitosa.
- [ ] T-4: Implementar la función `handleCopyLink` con `navigator.clipboard.writeText`, feedback temporizado de 2s, y manejo de errores.
- [ ] T-5: Rediseñar el JSX de la card con los tres modos (Android con botón, iOS con pasos, fallback con texto genérico) y los copy en español.
- [ ] T-6: Verificar `npm run lint` y `npm run build`.

## Notas / decisiones

- **Branch**: `feature/install-prompt` creado desde `develop`.
- **No se crea store nuevo**: el estado de instalación es local al componente (no compartido). No pertenece a Zustand.
- **`BeforeInstallPromptEvent`**: es un tipo no estandarizado (solo Chromium). Se define localmente para tipar el event listener. La interfaz oficial del W3C no está en los types de TypeScript estándar.
- **iOS no tiene alternativa programática**: Apple no expone ninguna API para instalar PWA desde JS. La única vía es el share sheet nativo. El spec prioriza UX clara (pasos numerados + copiar link) sobre intentar simular algo que no existe.
- **`preventDefault()` en `beforeinstallprompt`**: suprime el mini-infobar automático de Chrome para controlar cuándo y cómo se ofrece la instalación (mejor UX con nuestro botón custom).
- **No se muestra la card si el navegador no soporta PWA en absoluto** (p. ej. un browser muy viejo): se mantiene oculta porque `canInstall` será `false` e `isIOS` será `false`, pero en la práctica esto afecta a una porción insignificante de usuarios. Si se quisiera ocultar por completo, se podría agregar una condición extra, pero el botón "Copiar link" sigue siendo útil.
