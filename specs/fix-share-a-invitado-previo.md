# Fix: compatir lista a un email que ya es usuario (invitado previo)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Bug reportado por el dueño: cuando compartís una lista a un email que **previamente fue invitado a utilizar la app** (y por lo tanto ya existe como usuario), la server action tira error. Ejemplo concreto: el admin le dio acceso a la app a su esposa; la esposa accede, crea una lista y quiere compartirla con el admin. Como el admin ya existe como usuario, `addMemberByEmail` falla.

**Causa raíz (confirmada en la DB real)**: `svc.from("auth.users").select("id")` en `addMemberByEmail` (y el fallback de `getSharedMemberEmails`) **siempre** falla con `PGRST205` — la tabla `auth.users` no está expuesta en el schema cache de PostgREST (solo `public` y `graphql_public`). Como `existingUser?.id` queda `undefined`, el flujo **siempre** entra a la rama de "invitar" (`inviteUserByEmail`). Y `inviteUserByEmail` a un email que ya está registrado devuelve error (`User already registered`).

La vía correcta es la **admin API de Auth** (`svc.auth.admin.listUsers`), que devuelve los usuarios del proyecto incluso cuando `auth.users` no está en el schema de PostgREST. Confirmado: la misma query vía `admin.listUsers()` resuelve los 2 usuarios reales (`w.e.p.l.91@gmail.com`, `melisadanielafand@gmail.com`).

## Requisitos funcionales

- [x] RF-1: `addMemberByEmail` detecta correctamente si el email ya pertenece a un usuario registrado (vía `admin.listUsers`, no vía `from("auth.users")`).
- [x] RF-2: Si el usuario ya existe: lo agrega directo como miembro `editor` (sin re-invitar ni errores), conservando la notificación push.
- [x] RF-3: Si el usuario NO existe: se mantiene el flujo actual (allowlist previa + `inviteUserByEmail`).
- [x] RF-4: `getSharedMemberEmails` resuelve emails de miembros sin perfil vía `admin.listUsers` (misma corrección de fallback).

## Requisitos no funcionales

- RNF-1: La resolución de usuarios usa el mismo `getServiceClient()` (service role, solo servidor).
- RNF-2: No se agrega `auth` al schema cache (no se modifica la config de PostgREST); se usa la admin API.
- RNF-3: Quedan OK `npm run lint`, `npm run tsc --noEmit` y `npm run build`.
- RNF-4: Mensajes de éxito/error en español, sin cambios en la UX.

## Diseño técnico

### Resolución de usuario existente

Dado que la tabla `auth.users` no es consultable vía `supabase-js` estándar (`PGRST205`), reemplazar la consulta por la **admin API**:

```ts
async function findExistingUserId(
  svc: SupabaseClient,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  // Paginación generosa: app friends & family, listado completo por página.
  const { data, error } = await svc.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) {
    console.error("Error listando usuarios:", error);
    return null;
  }
  return (
    data?.users.find((u) => u.email?.toLowerCase() === normalized)?.id ?? null
  );
}
```

### `addMemberByEmail`

- Reemplazar:

```ts
const { data: existingUser } = await svc
  .from("auth.users")
  .select("id")
  .ilike("email", normalized)
  .maybeSingle();
```

por:

```ts
const userId = await findExistingUserId(svc, normalized);
let invited = false;
if (userId) {
  // ya es usuario: ir directo a crear membresía
} else {
  // rama de invitación (allowlist previa + inviteUserByEmail)
}
```

El resto del flujo (membresía, perfil, push si `!invited`) queda igual.

### `getSharedMemberEmails`

- Reemplazar el fallback `svc.from("auth.users").select("id, email").in("id", ...)` por una resolución vía `listUsers` (map `id -> email`).

## Criterios de aceptación

- [x] CA-1: Dado un email ya registrado en el proyecto, cuando se usa `addMemberByEmail`, entonces el usuario se agrega como miembro `editor` sin error y sin enviar invitación.
- [x] CA-2: Dado un email nuevo, cuando se usa `addMemberByEmail`, entonces se agrega a la allowlist y se envía invitación (flujo previo intacto).
- [x] CA-3: Dado un miembro sin perfil en `profiles`, cuando se resuelven los emails (`getSharedMemberEmails`), entonces se encuentra su email vía `listUsers`.
- [x] CA-4: `npm run lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Helper `findExistingUserId` (admin API) en `src/app/supabase-actions.ts`.
- [x] T-2: Aplicar en `addMemberByEmail` (rama existing vs invite).
- [x] T-3: Corregir fallback de `getSharedMemberEmails`.
- [x] T-4: Verificar con script contra la DB real (resolver usuario por email) + lint/tsc/build.

## Notas / decisiones

- **Por qué no `listUsers` paginado**: para una app friends & family con pocos usuarios, `perPage: 1000` cubre la práctica totalidad. Si creciera, se puede paginar.
- **Alternativa evaluada**: configurar `auth` en el schema cache de PostgREST (Dashboard → Settings → API → Exposed schemas). No se toca la config del proyecto; la admin API es la vía soportada y funciona igual.
- **Riesgo**: `inviteUserByEmail` a un usuario existente devolvía error y quedaba a medias (membresía creada en algunos casos). Con el fix, ese caso nunca se invita.