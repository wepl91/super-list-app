# Mover el form de compartir lista al menú de opciones del detalle

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-09-01

## Contexto / Objetivo

Hoy el formulario de "Compartir lista" (AddMemberForm) está **siempre visible** al final del detalle de una lista. Se busca: quitar esa visibilidad permanente y, en cambio, **agregar la acción "Compartir lista" al menú agrupador** de opciones del detalle (el que ya tiene "Ordenar alfabéticamente" y "Eliminar completados"). Al hacer click en ella, el formulario se **renderiza arriba del formulario de ingreso de elementos**.

## Requisitos funcionales

- [x] RF-1: Se elimina el `AddMemberForm` fijo de la parte inferior del detalle.
- [x] RF-2: El menú de opciones del detalle agrega la acción **"Compartir lista"** (con icono de compartir).
- [x] RF-3: Al hacer click en "Compartir lista", el `AddMemberForm` se renderiza **arriba del form de agregar elemento**, cerrando el menú.
- [x] RF-4: La acción "Compartir lista" solo aparece cuando el usuario es **owner** de la lista (compartir es privilegio del dueño). El resto del menú se mantiene para colaboradores.
- [x] RF-5: Abrir de nuevo el menú y clickear "Compartir" vuelve a mostrar el form (toggle simple), preservando el cierre con ✕ del form.

## Requisitos no funcionales

- RNF-1: `npm run lint`, `tsc --noEmit` y `next build` pasan.
- RNF-2: Accesibilidad: botones del menú con `role="menuitem"`, estados `aria-expanded`/`aria-pressed` apropiados.
- RNF-3: Sin dependencias nuevas.

## Diseño técnico

- **`src/components/ListOptionsMenu.tsx`**: nueva prop opcional `onShare?: () => void` y `canShare?: boolean`. Si `canShare && onShare`, se agrega un `menuitem` "Compartir lista" (icono de share) al inicio del menú.
- **`src/app/lista/[id]/page.tsx`**:
  - Se elimina el bloque `{isOwner && isSignedIn && <div className="mt-8"><AddMemberForm .../></div>}`.
  - Se agrega estado `shareOpen`.
  - `ListOptionsMenu` recibe `onShare={() => setShareOpen(v => !v)}` y `canShare={isOwner}`.
  - `AddMemberForm` se renderiza **condicionalmente arriba del form de añadir** cuando `shareOpen && isOwner && isSignedIn`, con `onClose={() => setShareOpen(false)}`.

## Criterios de aceptación

- [x] CA-1: El detalle ya no muestra el form de compartir permanente al final.
- [x] CA-2: Un owner puede abrir el menú → "Compartir lista" → se muestra el form arriba del form de agregar.
- [x] CA-3: Un colaborador (no owner) no ve la acción "Compartir lista".
- [x] CA-4: El cierre del form (✕) y el toggle del menú funcionan, sin form duplicado.
- [x] CA-5: `lint`, `tsc --noEmit` y `next build` pasan.

## Tareas de implementación (derivadas)

- [x] T-1: Extender `ListOptionsMenu` con `onShare`/`canShare` y la acción "Compartir lista".
- [x] T-2: Mover `AddMemberForm` al top del detalle (condicional `shareOpen`) y quitar el bloque fijo inferior.
- [x] T-3: Verificar `lint`/`tsc`/`build`.

## Notas / decisiones

- **Solo owner**: compartir sigue siendo privilegio del dueño (consistente con `addMemberByEmail` y RLS). Los colaboradores mantienen el resto de las acciones.
- **Toggle simple**: el form se abre con el menú (toggle on/off); cerrarlo con ✕ o deseleccionarlo deja el hueco sin form.