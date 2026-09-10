import type { ListItem } from "./types";

/**
 * Lógica pura de orden/fijación de items de una lista, sin dependencias del
 * store ni del DOM. Reordenar y fijar son data de la lista (se sincronizan),
 * por eso viven acá para poder testearlas aisladas.
 */

/**
 * Reordena `activeId` a la posición de `overId` dentro de su grupo natural
 * (pendientes o completados). Reasigna `position` 0..n-1 sobre el resultado.
 * Devuelve el array original (misma referencia) si el movimiento no aplica:
 * ids inexistentes, mismo item o grupos distintos.
 */
export function reorderItems(
  items: ListItem[],
  activeId: string,
  overId: string
): ListItem[] {
  const active = items.find((i) => i.id === activeId);
  const over = items.find((i) => i.id === overId);
  if (!active || !over || active.id === over.id) return items;
  if (!!active.completed !== !!over.completed) return items;

  const group = items.filter((i) => i.completed === active.completed);
  const from = group.findIndex((i) => i.id === activeId);
  const to = group.findIndex((i) => i.id === overId);
  if (from < 0 || to < 0) return items;

  const nextGroup = [...group];
  const [moved] = nextGroup.splice(from, 1);
  nextGroup.splice(to, 0, moved);

  let gi = 0;
  return items.map((item, idx) => {
    if (item.completed === active.completed) {
      return { ...nextGroup[gi++], position: idx };
    }
    return { ...item, position: idx };
  });
}

/** Separa los items fijados (ordenados por `position`) del resto. */
export function splitPinned(items: ListItem[]): {
  pinned: ListItem[];
  rest: ListItem[];
} {
  const pinned = items
    .filter((i) => i.pinned)
    .sort((a, b) => a.position - b.position);
  const rest = items
    .filter((i) => !i.pinned)
    .sort((a, b) => a.position - b.position);
  return { pinned, rest };
}

/** Alterna `pinned` del item indicado; devuelve el nuevo array (o el mismo si no existe). */
export function applyTogglePin(items: ListItem[], id: string): ListItem[] {
  let changed = false;
  const next = items.map((i) => {
    if (i.id !== id) return i;
    changed = true;
    return { ...i, updatedAt: Date.now(), pinned: !i.pinned };
  });
  return changed ? next : items;
}