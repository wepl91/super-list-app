<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Testing

Cada spec nuevo debe incluir tests automáticos por el código que introduce (regla de proceso, ver `specs/test-coverage.md`).

- Comandos: `npm test` (vitest run), `npm run test:coverage`, `npm run test:watch`.
- Coverage mínimo global 80% (líneas), 75% (ramas); medido sobre lógica + app, excluyendo server actions, `sw.ts`, Serwist y la capa de sync.
- Ejecutar `npm test`, `npm run lint`, `tsc --noEmit` y `next build` antes de commitear.
