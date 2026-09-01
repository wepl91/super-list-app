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
