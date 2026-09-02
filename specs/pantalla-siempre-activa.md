# Pantalla siempre activa (mantener encendida mientras se usa la app)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Evitar que el teléfono se bloquee mientras el usuario está usando la app (p. ej. siguiendo una lista de compras en el super). La pantalla debe permanecer encendida **solo** mientras la app está en primer plano (visible); si el usuario cambia de app o la oculta, se libera el bloqueo (la API lo hace automáticamente vía visibilitychange).

## Viabilidad técnica

Se usa la **Screen Wake Lock API** (`navigator.wakeLock.request("screen")`):

- **Soportada en**: Chromium (Chrome/Edge), incluido **Android**, y **Safari/iOS 16.4+**.
- **Requisito**: contexto seguro (HTTPS). Proyecto ya en HTTPS (Vercel) y localhost también es seguro.
- **Comportamiento clave**: el lock se libera solo cuando la pestaña pasa a background (visibilitychange). Hay que **re-adquirirlo** al volver a primer plano y ante eventos `release`.
- **Feature detection**: `"wakeLock" in navigator`. Si no hay soporte, no-op silencioso (sin romper nada).
- Se monta a nivel del **layout raíz** (client component) para cubrir toda la app.

Alternativa evaluada (no adoptada): no existe una vía web estándar para "no sleep" más allá de la Wake Lock API. En iOS <16.4 no hay forma estándar de mantener el display encendido; se documenta la limitación (no-op).

## Requisitos funcionales

- [x] RF-1: Mientras la app está visible, se mantiene el lock de pantalla (`wakeLock`).
- [x] RF-2: Al volver a primer plano (visibilitychange -> visible) se re-adquiere el lock.
- [x] RF-3: Ante liberación inesperada (evento `release`) se re-intenta adquirir.
- [x] RF-4: Al desmontar se libera el lock explícitamente.
- [x] RF-5: Si el navegador no soporta Wake Lock, no-op silencioso y sin logs de error.

## Requisitos no funcionales

- RNF-1: Componente client pequeño, sin dependencias nuevas.
- RNF-2: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-3: No interfiere con el rendimiento (sin timers/leaks).

## Diseño técnico

### Hook `useScreenWakeLock`

En `src/lib/useScreenWakeLock.ts`: hook que adquiere/re-adquiere/libera el lock.

### Componente `ScreenKeepAwake`

En `src/components/ScreenKeepAwake.tsx` (client, render null) que llama al hook.

### Montaje

En `src/app/layout.tsx`, junto a `<SyncProvider />`.

## Criterios de aceptación

- [x] CA-1: El lock de pantalla se adquiere al montar la app en un navegador con soporte.
- [x] CA-2: Al ocultar y volver a mostrar la app, el lock se re-adquiere.
- [x] CA-3: En navegadores sin Wake Lock no hay errores ni comportamiento degradado.
- [x] CA-4: Sin leaks: al desmontar se libera el sentinel y se remueve el listener.
- [x] CA-5: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Crear `src/lib/useScreenWakeLock.ts`.
- [x] T-2: Crear `src/components/ScreenKeepAwake.tsx`.
- [x] T-3: Montar en `src/app/layout.tsx`.
- [x] T-4: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **Decisión**: Wake Lock API como mecanismo estándar; sin dependencias nuevas; montaje a nivel de app para cubrir todas las rutas.
- **Limitación**: en iOS < 16.4 no se puede mantener la pantalla encendida desde la web; la app queda igualmente funcional (no-op).