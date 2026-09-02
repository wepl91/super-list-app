# Test coverage (>= 80%) + tests automáticos

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

La app no tenía ningún test automático. Se quiere:
1. Subir el coverage a **al menos el 80%**.
2. Que cada implementación nueva venga con sus tests (regla de proceso).

## Decisiones tomadas (contestación del dueño)

| Pregunta | Elección |
|---|---|
| Alcance / qué medir | **Lógica pura + la app**: stores (zustand/prefs), lib (haptics, loginPrompt, useHydrated, theme, useScreenWakeLock) y componentes React (ConfirmDialog, AuthGateCta, ThemeToggle, InstallPrompt, ListOptionsMenu, ScreenKeepAwake). Se **excluyen** server actions (`supabase-actions.ts`), `sw.ts`, Serwist y la capa de sync (dependen de Supabase/web-push/SW: su coverage sería artificial y frágil) |
| Stack | **Vitest + React Testing Library + jsdom** (coverage con v8) — compatible con Next 16 / React 19 |

## Requisitos funcionales

- [x] RF-1: Scripts `test`, `test:watch` y `test:coverage` en `package.json`.
- [x] RF-2: Config `vitest.config.ts` con entorno jsdom, alias `@/*`, setup de matchers jest-dom y mocks base (matchMedia + navigator.vibrate).
- [x] RF-3: Cobertura medida sobre la lógica + la app, con **thresholds** de linea/función/statement en 80% y branches 75%.
- [x] RF-4: Tests de lógica: `haptics`, `openLoginModal`, `useHydrated`, `ThemeProvider/useTheme`, `preferencesStore`, `useScreenWakeLock`.
- [x] RF-5: Tests de componentes: `ConfirmDialog`, `AuthGateCta`, `ThemeToggle`, `InstallPrompt`, `ListOptionsMenu`, `ScreenKeepAwake`.
- [x] RF-6: El coverage global supera 80% (resultado real: lines 95.1%, stmts 90.9%, funcs 88.46%, branches 80.72%).

## Requisitos no funcionales

- RNF-1: `npm test` / `npm run test:coverage` pasan (exit 0).
- RNF-2: `npm run lint`, `tsc --noEmit` y `next build` siguen pasando.
- RNF-3: Los tests no requieren red ni servicios externos (todo mockeado/jsdom).
- RNF-4: Regla de proceso: en cada spec nuevo se agregan tests por el código introducido.

## Diseño técnico

- **Deps dev añadidas**: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@vitejs/plugin-react`.
- **`vitest.config.ts`**: `environment: "jsdom"`, `globals: true`, `setupFiles: ["./vitest.setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`, coverage `provider: "v8"`, con `include` enumerado y `thresholds`. Alias `@` → `./src`.
- **`vitest.setup.ts`**: importa `@testing-library/jest-dom/vitest` y provee stubs de `window.matchMedia` y `navigator.vibrate` (ausentes en jsdom).
- **Tests**:
  - `src/lib/haptics.test.ts` — vibración con/default y custom, no-op sin soporte y con error.
  - `src/lib/loginPrompt.test.ts` — dispara `CustomEvent` y no-op sin `window`.
  - `src/lib/useHydrated.test.ts` — devuelve `true` en cliente.
  - `src/lib/theme.test.tsx` — tema por defecto, preferencia de sistema, localStorage y toggle+persistencia; error fuera del provider.
  - `src/lib/stores/preferencesStore.test.ts` — valores por defecto, setters y persistencia.
  - `src/lib/useScreenWakeLock.test.tsx` — pide wakeLock, libera al desmontar, no-op sin soporte y ante fallo.
  - `src/components/ConfirmDialog.test.tsx` — cerrado/abierto, labels, confirmar/cancelar, Escape, backdrop, foco inicial.
  - `src/components/AuthGateCta.test.tsx` — render, disparo de login, modo compact.
  - `src/components/ThemeToggle.test.tsx` — estados claro/oscuro y toggle.
  - `src/components/InstallPrompt.test.tsx` — standalone null, iOS, beforeinstallprompt, fallback.
  - `src/components/ListOptionsMenu.test.tsx` — apertura, sort, compartir (condicional), deshabilitado sin completados, confirmación de borrado.
  - `src/components/ScreenKeepAwake.test.tsx` — no-op sin/con wakeLock.

## Criterios de aceptación

- [x] CA-1: `npm run test:coverage` reporta coverage global ≥ 80% (real: 90.9% stmts).
- [x] CA-2: Todos los tests pasan (46 tests / 12 archivos).
- [x] CA-3: `lint`, `tsc --noEmit` y `next build` pasan.
- [x] CA-4: Servicios externos no son necesarios para correr los tests.

## Tareas de implementación (derivadas)

- [x] T-1: instalar deps + configurar `vitest.config.ts` + `vitest.setup.ts`.
- [x] T-2: agregar scripts `test`/`test:watch`/`test:coverage`.
- [x] T-3: tests de lógica pura y stores.
- [x] T-4: tests de componentes.
- [x] T-5: verificar coverage ≥80%, lint, tsc, build; commit; push; PR apilado; quitar spec del tmp.

## Notas / decisiones

- **Exclusiones justificadas**: `supabase-actions.ts`, `sw.ts`, Serwist y `src/lib/sync/**` quedan fuera del reporte de coverage porque su valor (llamadas a Supabase/web-push/SW) no se puede validar de forma útil en jsdom; testearlas con mocks completos daría un coverage inflado y frágil sin aportar a la corrección. El contador real de la app (stores + componentes + helpers) sí se mide y supera el 80%.
- **Duración**: el primer `npm install -D ...` tuvo un error de red transitorio; reintentando funcionó.
- **Regla de proceso**: a partir de ahora cada spec debe incluir tests. Documentado en `AGENTS.md` (sección Testing).