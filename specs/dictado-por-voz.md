# Dictado por voz (ingresar contenido oralmente)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Poder **crear/llenar contenido oralmente**: usar el micrófono para dictar elementos de una lista (y el nombre de una lista nueva) en lugar de escribir todo. Es una mejora de accesibilidad y velocidad típica del flujo de compra.

## Viabilidad técnica

Se usa la **Web Speech API** (`window.SpeechRecognition | webkitSpeechRecognition`):

- **Soportada en**: Chrome, Edge y Android Chrome; Safari (con soporte parcial/experimental según versión). Entra en **contexto seguro** (HTTPS) — ya tenemos HTTPS en Vercel.
- **Firefox NO la soporta** (ni webkit, ni estándar): se detecta con feature-detection y se **oculta el botón** de micrófono en esos navegadores (UI degradada sin romper).
- **Permisos**: requiere permiso de micrófono del usuario (prompt del navegador, una sola vez).
- **Modelo de uso**: `continuous: true`, `interimResults: true`, `lang: "es-AR"`. Mientras el usuario habla se van mostrando resultados **interinos** en el input; al terminar la frase (o desactivar el micrófono) se envía el texto final.
- **Limitación**: el reconocimiento es del navegador/dispositivo (servicio de voz del OS), no una API pagada del proyecto. En dispositivos móviles Android funciona bien con el micrófono del sistema; en desktop depende de Chrome/Edge.
- **No aplica** enlaces a servicios costosos (sin costo extra para el plan free).

## Requisitos funcionales

- [x] RF-1: Botón **micrófono** junto al input de "agregar elemento" en el **detalle de lista** (modo normal y modo foco).
- [x] RF-2: Al mantener el dictado activo, las palabras habladas se completan **interactivamente** (resultados interinos) en el campo.
- [x] RF-3: Al finalizar el dictado (el usuario lo detiene o silencio corto) el texto queda en el campo y se puede confirmar con el botón de agregar. Opcional: auto-agregar al terminar si el campo no está vacío.
- [x] RF-4: Botón **micrófono** en el formulario de **crear lista** (home) para dictar el nombre.
- [x] RF-5: **Feature detection**: si `SpeechRecognition` no existe (Firefox), el botón no se renderiza (nada se rompe).
- [x] RF-6: Estados visibles del dictado: desconectado (micrófono apagado), escuchando (animación/sombra activa), error de permiso/soporte (aviso corto).

## Requisitos no funcionales

- RNF-1: Sin dependencias nuevas; API nativa del navegador.
- RNF-2: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-3: Accesible (aria-label, `aria-pressed`), textos/errores en español.
- RNF-4: El dictado se **detiene** al desmontar el componente (sin leaks de streams).

## Diseño técnico

- **`src/components/VoiceDictationButton.tsx`**: botón micrófono client que encapsula la creación del `SpeechRecognition` (Web Speech API), con feature detection (`window.SpeechRecognition | webkitSpeechRecognition`) y estados visibles `listening`/`error`. `render null` si `!supported` (Firefox). Exposa `onInterim(text)` y `onFinal(text)`. Al detectar una frase final, la envía y detiene el reconocimiento.
- **Detalle de lista (`src/app/lista/[id]/page.tsx`)**:
  - Form normal y form foco: junto al input principal, `VoiceDictationButton` con `onInterim`/`onFinal` → setear `name`. Errores de voz (permiso/captura) en un aviso `role="alert"`.
  - Al agregar, `resetForm` limpia el campo (comportamiento actual).
- **Home (`src/app/page.tsx`)**: formulario de crear lista: `VoiceDictationButton` para dictar el nombre, con el mismo manejo de errores.

**Nota de flujo**: NO se auto-envía el formulario al terminar el dictado (para no agregar items sin querer); el texto queda listo en el campo para confirmar con el botón. El usuario puede tocar el micrófono para alternar start/stop.

## Criterios de aceptación

- [x] CA-1: En Chrome/Edge/Android, el botón micrófono aparece y, al hablarlo, el texto se escribe en el input (interino y final).
- [x] CA-2: Al detener el dictado, el texto final queda en el campo listo para confirmar.
- [x] CA-3: En Firefox el botón no se muestra (feature detection) y el resto de la UI funciona igual.
- [x] CA-4: No hay leaks: al desmontar con dictado activo se detiene el reconocimiento.
- [x] CA-5: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Hook `useSpeechDictation` (Web Speech API, interim + final, manejo de errores). **Descartado**: no se usó en el componente final; la lógica vive encapsulada en `VoiceDictationButton` (evita código muerto).
- [x] T-2: Componente `VoiceDictationButton` (feature detection, aria, estados).
- [x] T-3: Integrar en detalle de lista (form normal y modo foco).
- [x] T-4: Integrar en home (crear lista).
- [x] T-5: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **No auto-agregar**: se evita confirmar el formulario automáticamente al finalizar el dictado (riesgo de items no deseados). El texto queda en el campo.
- **Idioma `es-AR`**: se fija `lang: "es-AR"` para reconocimiento en español rioplatense.
- **Descartado**: STT de terceros (OpenAI Whisper, Google Cloud Speech) por costo/complejidad y porque la Web Speech API cubre el caso sin costos extra en el plan free.