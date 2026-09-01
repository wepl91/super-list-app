# Home de Listas (listado, acciones y reordenamiento)

**Estado**: `implemented`
**Versión**: v1
**Fecha**: 2026-08-31

## Contexto / Objetivo

Super List es una PWA de listas (to-do / shopping) instalable, con soporte offline y notificaciones push. Este spec define el **Home de inicio**: la pantalla principal que muestra **todas las listas** creadas por el usuario, junto con sus acciones a nivel de lista (eliminar, clonar) y la capacidad de **reordenar** el listado mediante **drag & drop**.

Define además el **modelo de datos** de las listas y sus elementos (nombre, descripción, cantidad), que es la base para la persistencia cloud y la compartición entre usuarios definidas en `specs/supabase-storage.md` (agregar miembro por email, sin invitación).

Este spec se centra **solo en el Home y la gestión a nivel de lista**. El CRUD de elementos *dentro* de una lista se trata en `specs/gestion-de-listas.md`, que se actualiza para alinear el modelo de datos.

## Requisitos funcionales

- [ ] RF-1: El Home muestra todas las listas creadas por el usuario, ordenadas según su posición.
- [ ] RF-2: Cada lista se muestra con su **nombre**.
- [ ] RF-3: El usuario puede **crear** una lista nueva (definiendo su nombre).
- [ ] RF-4: El usuario puede **eliminar** una lista (con confirmación para evitar borrados accidentales).
- [ ] RF-5: El usuario puede **clonar** una lista (copia exacta con todos sus elementos, cantidades y estados, con un nombre derivado p. ej. `<nombre> (copia)`).
- [ ] RF-6: El usuario puede **reordenar** las listas mediante **drag & drop**, y el nuevo orden persiste al recargar.
- [ ] RF-7: El modelo de lista contiene un nombre; cada elemento tiene **nombre**, **descripción** (opcional) y **cantidad a comprar** (número + unidad opcional, p. ej. "3" o "3 kg").
- [ ] RF-8: El Home permite navegar a una lista (entrar a ver/editar sus elementos).
- [ ] RF-9: El estado del Home (listas, orden, acciones) sobrevive a la recarga y al modo offline.

## Requisitos no funcionales

- RNF-1: La app debe seguir funcionando sin conexión (Service Worker / Serwist) en el Home.
- RNF-2: Interfaz mobile-first y accesible: drag & drop accesible (alternativa por teclado / orden o botones de mover), contraste, inputs etiquetados.
- RNF-3: Bundle ligero para dispositivos móviles; la librería de drag & drop debe ser ligera y tree-shakeable.
- RNF-4: Las acciones destructivas (eliminar) requieren confirmación.

## Diseño técnico

- **Arquitectura**: 
  - Página Home en `src/app/page.tsx` (reemplaza la demo actual).
  - Componentes de listado en `src/components/` (p. ej. `ListCard`, `ListaDeListas`/`ListsHome`).
  - Lógica y tipos en `src/lib/`.
- **Estado**: store Zustand con persistencia (`persist`) como capa local (convención del proyecto), en `src/lib/stores/listStore.ts`. Se mantiene el orden de las listas como array (el índice es el orden).
- **Datos / tipos** en `src/lib/types.ts`:
  ```ts
  interface List {
    id: string;            // uuid o crypto.randomUUID()
    name: string;          // nombre de la lista (RF-7)
    items: ListItem[];     // elementos de la lista
    createdAt: number;     // timestamp
  }

  interface ListItem {
    id: string;
    name: string;          // nombre del elemento
    description?: string;  // descripción opcional
    quantity: number;          // cantidad a comprar
    unit?: string;             // unidad opcional (kg, l, unidades...)
    completed: boolean;
    createdAt: number;
  }
  ```
- **Drag & drop**: se usa `@dnd-kit/core` + `@dnd-kit/sortable` (ligero, accesible y moderno; decisión confirmada). El reordenamiento muta el orden del array en el store persistente.
- **Persistencia**: Zustand `persist` (localStorage / IndexedDB vía Serwist). La sincronización cloud se define en `specs/supabase-storage.md` (capa local como caché + sync cloud; offline-first).
- **Identidad de listas**: `crypto.randomUUID()` (no requiere backend).
- **Navegación**: clonar/eliminar/entrar desde el `ListCard`. Las rutas de detalle de lista se definirán en `gestion-de-listas.md`.

## Criterios de aceptación

- [ ] CA-1: Dado un usuario con varias listas creadas, cuando abre el Home, entonces ve todas las listas con su nombre en el orden guardado.
- [ ] CA-2: Dado el Home, cuando el usuario crea una lista con un nombre, entonces aparece nueva en el listado.
- [ ] CA-3: Dado el Home, cuando el usuario arrastra una lista a otra posición, entonces el nuevo orden se conserva al recargar la página.
- [ ] CA-4: Dado una lista en el Home, cuando el usuario confirma su eliminación, entonces desaparece del listado y sus datos se eliminan.
- [ ] CA-5: Dado una lista con elementos (nombre, descripción, cantidad y unidad), cuando el usuario la clona, entonces se crea una nueva lista con los mismos elementos, cantidades, unidades y descripciones.
- [ ] CA-6: Dado el Home, cuando el usuario queda sin conexión, entonces las listas y sus acciones siguen funcionando y el estado se conserva localmente.

## Tareas de implementación (derivadas)

- [ ] T-1: Definir los tipos `List` y `ListItem` (con `quantity`, `unit?` y `description?`) en `src/lib/types.ts`.
- [ ] T-2: Crear/ampliar el store Zustand persistente `src/lib/stores/listStore.ts` con acciones: `createList`, `deleteList`, `cloneList`, `reorderLists`.
- [ ] T-3: Implementar la acción de clonar (deep copy de la lista con nuevo `id` y nombre derivado).
- [ ] T-4: Construir el Home en `src/app/page.tsx` con el grid/lista de `ListCard`.
- [ ] T-5: Crear `src/components/ListCard.tsx` con acciones (entrar, clonar, eliminar con confirmación).
- [ ] T-6: Integrar drag & drop (propuesta `@dnd-kit`) para reordenar las listas, persistiendo el orden.
- [ ] T-7: Añadir formulario de creación de lista (nombre).
- [ ] T-8: Verificar `npm run lint` y `npm run build`.

## Notas / decisiones

- La página actual `src/app/page.tsx` contiene una demo (lista hardcodeada + push/install). Se reemplaza el listado por el Home real; los bloques de push/install pueden moverse a otro lugar o mantenerse al pie en esta fase.
- El modelo de datos ampliado (descripción + cantidad) es un cambio sobre la demo actual; alineará el spec `gestion-de-listas.md`.
- Las listas son compartibles entre usuarios mediante el flujo definido en `specs/supabase-storage.md` (agregar miembro por email directo, sin invitación, con `list_members`). Por eso `List` usa `id` estable (uuid) para facilitar esa evolución.
- Decidido: drag & drop con `@dnd-kit`. Cantidad = número + unidad opcional (`quantity: number`, `unit?: string`). Comportamiento de clonado del nombre: `<nombre> (copia)`.
