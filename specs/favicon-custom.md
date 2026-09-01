# Favicon custom para renderizado en la tab

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Super List es una PWA instalable con soporte offline y notificaciones push. Actualmente la app **no tiene favicon propio**: al abrir la tab del navegador se muestra el favicon por defecto, lo que degrada la identidad de marca en el navegador (tab, historial, marcadores).

Este spec define la creación de un **favicon custom** (logo/marca de Super List) y su integración para que se renderice correctamente en la tab del navegador.

## Requisitos funcionales

- [x] RF-1: La app debe exponer un **favicon custom** que se renderice en la tab del navegador.
- [x] RF-2: El favicon debe corresponder a la **identidad visual** de Super List (coherente con los iconos PWA existentes en `public/`).
- [x] RF-3: El favicon debe funcionar en navegadores modernos (formato SVG + variante ICO/PNG de fallback) y **adaptarse al tema** (light/dark) cuando sea posible.
- [x] RF-4: El favicon debe estar disponible en la ruta raíz de la app (para que el navegador lo detecte automáticamente como `favicon.ico`/`favicon.svg`).

## Requisitos no funcionales

- RNF-1: El recurso debe ser **ligero** (el SVG es preferible por peso y escalabilidad).
- RNF-2: El clip de imágenes debe ser pequeño (idealmente < 1 KB para el SVG).
- RNF-3: Debe respetar **color-modes** del navegador (`prefers-color-scheme`) para no desentonar en tema oscuro.

## Diseño técnico

- **Arquitectura**:
  - **Descubrimiento al investigar**: existe `src/app/favicon.ico` (file convention de Next.js, favicon por defecto) que se inyecta automáticamente en el `<head>`. Ese es el favicon que se mostraba en la tab. Por eso:
  - Se reemplaza el contenido de `src/app/favicon.ico` (file convention) por el favicon custom multi-tamaño (16/32/48/256). Cubre el fallback ICO (CA-3) y lo que se renderiza por defecto en la tab (CA-1).
  - Se crea `public/favicon.svg` (logo SVG de Super List) y `public/favicon-dark.svg` (variante para `prefers-color-scheme: dark`).
  - En `src/app/layout.tsx`, dentro de `metadata.icons`, se declaran únicamente las variantes SVG (light/dark) con `media: "prefers-color-scheme"`. El ICO no se declara en metadata para evitar links duplicados con la file convention.
- **Datos**: Sin cambios de modelo de datos ni estado.
- **Assets**: Se genera un SVG con la marca (p. ej. una lista/check estilizado con los colores de la marca definidos en CSS: `--background`, `--foreground`, acentos visibles en los theme tokens del proyecto).

## Criterios de aceptación

- [x] CA-1: Dado un navegador moderno, cuando se abre la app en la tab, entonces se muestra el favicon custom de Super List.
- [x] CA-2: Dado que la app cambia de tema (light/dark), cuando se recarga la tab, entonces el favicon se adecúa al color-scheme activo.
- [x] CA-3: Dado un navegador sin soporte de favicon SVG, cuando se abre el sitio, entonces se muestra el favicon de fallback (ICO/PNG).
- [x] CA-4: Dado el bundle de la app, cuando se hace el build, entonces no hay errores de lint/build y el favicon se sirve correctamente desde la raíz.

## Tareas de implementación (derivadas)

- [x] T-1: Crear `public/favicon.svg` con la marca custom de Super List.
- [x] T-2: Crear `public/favicon-dark.svg` (variante para tema oscuro).
- [x] T-3: Generar `public/favicon.ico` multi-tamaño (16/32/48/256) a partir del SVG y reemplazar `src/app/favicon.ico` con el mismo asset (file convention de Next.js, fallback ICO).
- [x] T-4: Declarar `icons` (variantes SVG light/dark) en la `metadata` de `src/app/layout.tsx`.
- [x] T-5: Ejecutar `npm run lint`, `npm run build` y verificar el `<head>` generado en el build.

## Notas / decisiones

- Se prioriza un **SVG estático** (sin técnicas JS de favicon dinámico) por simplicidad, peso y compatibilidad; la adaptación de tema se consigue con las variantes `prefers-color-scheme` que soporta la metadata `icons` de Next.js.
- El favicon es independiente de los iconos PWA (192/512/maskable); este spec cubre **solo** el favicon de la tab.
- Trabajo en el branch `feature/favicon-custom` creado desde `develop`.
- **Decisión de implementación**: la file convention `src/app/favicon.ico` (default de Next.js) precedía al favicon custom y era lo que se mostraba en la tab. Se reemplaza su contenido por el favicon custom; el ICO ya no se declara en metadata (evita links duplicados, la file convention lo inyecta solo). Los SVG se sirven desde `public/` vía metadata, con la variante dark para `prefers-color-scheme`.
