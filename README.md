# Super List

Aplicación de **lista de supermercado colaborativa en tiempo real**, construida
con Next.js, React y Supabase.

## Stack

- **Frontend:** Next.js 16 (Turbopack) + React 19 + Tailwind CSS
- **Estado:** Zustand (con persistencia)
- **Backend/DB:** Supabase (auth Google/email, PostgreSQL + RLS, realtime)
- **Extras:** dnd-kit (reordenar), web-push (notificaciones), Serwist (PWA)

## Funcionalidades

- Crear, renombrar, duplicar y eliminar listas
- Compartir listas con otros usuarios por email (invitación a nuevos o
  adición directa a quienes ya tienen cuenta)
- Ver los emails de las personas con las que compartís cada lista (solo owner)
- Sincronización en tiempo real entre dispositivos
- Notificaciones push
- Soporte PWA (instalable) con tema claro/oscuro

## Comenzar

Prerrequisitos: Node.js (vía nvm, v24) y npm.

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### Variables de entorno

Creá un archivo `.env.local` (no se versiona). Variables necesarias según el
auth y Supabase que uses. Podés pedir un ejemplo al owner del repo.

## Comandos útiles

```bash
npm run dev        # servidor de desarrollo
npm run build      # build de producción
npm run lint       # ESLint
```

## Base de datos / migraciones

Ver la convención en la cabecera de `supabase/schema.sql`. Cada cambio de
schema va en un archivo de migración **nuevo** en `supabase/migrations/`,
idempotente, y se ejecuta por separado en el SQL Editor.

## Contribuir

Ver [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el flujo de ramas (GitFlow con
`main` + `develop`).
