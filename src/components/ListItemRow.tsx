"use client";

import { useState } from "react";
import { useListStore } from "@/lib/stores/listStore";
import { haptic } from "@/lib/haptics";
import ConfirmDialog from "@/components/ConfirmDialog";
import type { ListItem } from "@/lib/types";

interface ListItemRowProps {
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
  /** Modo solo lectura (sin sesión): deshabilita completar/editar/eliminar. */
  isReadOnly?: boolean;
  /** Modo foco: fila completa clickeable, controles más grandes, háptica. */
  focusMode?: boolean;
}

function quantityLabel(item: ListItem): string {
  if (item.unit) return `${item.quantity} ${item.unit}`;
  return `${item.quantity}`;
}

export default function ListItemRow({
  listId,
  item,
  editing,
  onEdit,
  onCancelEdit,
  onSave,
  isReadOnly = false,
  focusMode = false,
}: ListItemRowProps) {
  const toggleItem = useListStore((s) => s.toggleItem);
  const deleteItem = useListStore((s) => s.deleteItem);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [quantity, setQuantity] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit ?? "");
  const [deleteOpen, setDeleteOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, description, quantity, unit });
  }

  function handleToggle() {
    if (isReadOnly) return;
    if (focusMode) haptic();
    toggleItem(listId, item.id);
  }

  if (editing) {
    return (
      <li className="rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label htmlFor="edit-name" className="sr-only">
            Nombre
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
          <label htmlFor="edit-desc" className="sr-only">
            Descripción
          </label>
          <input
            id="edit-desc"
            type="text"
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
          <div className="flex gap-2">
            <label htmlFor="edit-qty" className="sr-only">
              Cantidad
            </label>
            <input
              id="edit-qty"
              type="number"
              min={0}
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
              className="w-24 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground dark:border-zinc-700"
            />
            <label htmlFor="edit-unit" className="sr-only">
              Unidad
            </label>
            <input
              id="edit-unit"
              type="text"
              placeholder="Unidad (kg, l...)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary px-3 py-2 text-sm text-white hover:opacity-90"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-surface dark:border-zinc-700 ${
        focusMode ? "p-4 focus-within:ring-2 focus-within:ring-primary" : "p-3"
      }`}
    >
      <label
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 ${
          isReadOnly || focusMode ? "" : "w-auto"
        }`}
      >
        <span className="sr-only">Completar {item.name}</span>
        <input
          type="checkbox"
          checked={item.completed}
          onChange={handleToggle}
          disabled={isReadOnly}
          aria-label={`Completar ${item.name}`}
          className={`shrink-0 accent-primary disabled:opacity-50 ${
            focusMode ? "h-8 w-8" : "h-4 w-4"
          }`}
        />
        <span
          className={`min-w-0 flex-1 ${
            item.completed ? "text-text-secondary line-through" : ""
          } ${focusMode ? "text-lg font-medium" : "text-sm"}`}
        >
          {item.name}
        </span>
      </label>
      {!focusMode && item.description && (
        <p className="min-w-0 truncate text-xs text-text-secondary">
          {item.description}
        </p>
      )}
      <span
        className={`shrink-0 font-medium text-text-secondary ${
          focusMode ? "text-lg" : "text-xs"
        }`}
      >
        {quantityLabel(item)}
      </span>
      <div className={`flex shrink-0 gap-1 ${focusMode ? "gap-2" : ""}`}>
        {!isReadOnly && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${item.name}`}
              title="Editar"
              className={`rounded-lg text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800 ${
                focusMode ? "p-3" : "p-2"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={focusMode ? "h-6 w-6" : "h-4 w-4"}
                aria-hidden="true"
              >
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Eliminar ${item.name}`}
              title="Eliminar"
              className={`rounded-lg text-text-secondary hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 ${
                focusMode ? "p-3" : "p-2"
              }`}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={focusMode ? "h-6 w-6" : "h-4 w-4"}
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h.04l.81 9.9A2.25 2.25 0 0 0 6.09 17.5h7.82a2.25 2.25 0 0 0 2.24-2.1l.81-9.9H17a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V4h-5v-.25ZM7 8.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 7 8.75Zm6 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 13 8.75Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar elemento"
        message={`¿Seguro que querés eliminar "${item.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          if (!isReadOnly) {
            deleteItem(listId, item.id);
          }
          setDeleteOpen(false);
        }}
      />
    </li>
  );
}
