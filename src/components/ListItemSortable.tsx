"use client";

import { useSortable } from "@dnd-kit/sortable";
import ListItemRow from "@/components/ListItemRow";
import type { ListItem } from "@/lib/types";

interface ListItemSortableProps {
  listId: string;
  item: ListItem;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (input: {
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
  }) => void;
  isReadOnly?: boolean;
  focusMode?: boolean;
}

/**
 * Envoltura sortable de una fila del detalle. El arrastre arranca desde el
 * handle `GripVertical` de la fila (long-press a través del PointerSensor con
 * delay de la página) para no competir con el clic/toggle ni con el swipe.
 */
export default function ListItemSortable({
  listId,
  item,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  isReadOnly = false,
  focusMode = false,
}: ListItemSortableProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: isReadOnly });

  return (
    <ListItemRow
      listId={listId}
      item={item}
      editing={editing && !isReadOnly}
      onEdit={onEdit}
      onCancelEdit={onCancelEdit}
      onSave={onSave}
      isReadOnly={isReadOnly}
      focusMode={focusMode}
      drag={{ attributes, listeners, setNodeRef, transform, transition, isDragging }}
    />
  );
}