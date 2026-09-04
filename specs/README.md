# Specs — Super List

Este directorio contiene las especificaciones (specs) del proyecto bajo el enfoque **Spec-Driven Development (SDD)**.

## Flujo

1. **Escribir el spec** — usa el command `/spec` (o pide `spec-writer`) para crear/refinar un spec en `specs/`.
2. **Aprobar** — revisa el spec; el código no se implementa hasta su aprobación.
3. **Implementar** — desglosa el spec en tareas y codifícalo (agente `build`).
4. **Verificar** — `npm run lint` + `npm run build` + cumplir criterios de aceptación.

## Convenciones

- Un archivo `.md` por feature: `specs/<feature>.md`.
- El campo `Estado` en el frontmatter del spec va `draft` → `approved` → `implemented`.
- Mantén el formato del template definido en el agente `spec-writer`.

## Specs actuales

- `gestion-de-listas.md` — capacidad core de listas (draft).
- `ux-microinteracciones-globales.md` — base global de microinteracciones (implemented).
- `ux-home-navegacion.md` — UX del home y la navegación (implemented).
- `ux-detalle-lista-visual.md` — UX del detalle de lista; integra `ui-elemento-lista-layout.md` (implemented).
- `migracion-iconos-lucide.md` — reemplazo de SVGs inline por `lucide-react` (implemented).
- `ui-elemento-lista-layout.md` — draft de layout del elemento; integrado/superseded por `ux-detalle-lista-visual.md`.

> Los specs de UX/UI tienen dependencias entre sí: implementar en orden
> `microinteracciones-globales` → `home-navegacion` / `detalle-lista-visual`.
