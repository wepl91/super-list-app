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

| Variable | Ámbito | Descripción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `*_ANON_KEY`) | cliente | clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | **server** | service role (resolver emails, gestionar membresías y allowlist). Nunca al bundle |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_EMAIL` | cliente/server | web-push |
| `ADMIN_EMAIL` | **server** | email del dueño con permiso de invitar a usar la app (`inviteToApp`). Es la fuente de verdad de permisos |
| `NEXT_PUBLIC_ADMIN_EMAIL` | cliente | controla la visibilidad del botón "Invitar a usar la app" (solo UI; el servidor re-valida) |

> **Importante (despliegue):** además de `.env.local`, estas variables deben
> setearse en **Vercel** (Environment Variables) para producción. Las de ámbito
> "server" (`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `VAPID_PRIVATE_KEY`,
> `VAPID_EMAIL`) no se exponen al cliente; las `NEXT_PUBLIC_*` sí.

## Registro cerrado (allowlist)

El registro a la app está **cerrado** a un conjunto privado de emails (uso
personal / friends & family). Solo pueden crear cuenta los emails presentes en
la tabla `public.allowed_emails`:

- El **admin** (email = `ADMIN_EMAIL`) puede invitar a usar la app desde el
  menú de usuario ("Invitar a usar la app").
- **Compartir una lista** con alguien que aún no tiene cuenta también lo
  autoriza (lo agrega a la allowlist y le envía invitación).
- Cualquier signup (email/contraseña o Google) cuyo email **no** esté en la
  allowlist es rechazado por un trigger de base de datos.

La siembra inicial del admin se hace en la migración (con un placeholder que
debés reemplazar en el SQL Editor por tu email real antes de registrar tu
cuenta) o invitándote a vos mismo desde la UI.

### Límites del plan free de Supabase (documentación)

- **Rate limiting custom NO configurable**: el plan free no permite definir
  rate limits custom; solo aplican los del **gateway** (~500 req/s globales) y
  el **throttle de Auth**. No hay protección adicional configurable por código.
- **Alertas de uso**: se configuran **manualmente** en el **Dashboard** de
  Supabase (umbrales de uso/alertas), no por código. Revisá el dashboard
  periódicamente para monitorear el consumo del proyecto.

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
