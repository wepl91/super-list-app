"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
  const [deleting, setDeleting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name, description, quantity, unit });
  }

  function handleToggle() {
    if (isReadOnly) return;
    if (focusMode) haptic("toggle");
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
        deleting ? "pointer-events-none opacity-0 transition-opacity duration-150" : ""
      } ${
        item.completed ? "animate-row-pop" : ""
      } ${
        focusMode ? "p-4 focus-within:ring-2 focus-within:ring-primary" : "p-3"
      }`}
    >
      <label
        className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 ${
          isReadOnly ? "cursor-not-allowed" : ""
        }`}
      >
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
        <span className="min-w-0 flex-1">
          <span
            className={`block min-w-0 ${
              item.completed ? "text-text-secondary line-through" : ""
            } ${focusMode ? "text-lg font-medium" : "text-sm"}`}
          >
            {item.name} <span className="font-medium text-text-secondary">({quantityLabel(item)})</span>
          </span>
          {item.description && (
            <p className="line-clamp-2 text-xs text-text-secondary">
              {item.description}
            </p>
          )}
        </span>
      </label>
      <div className={`flex shrink-0 gap-1 ${focusMode ? "gap-2" : ""}`}>
        {!isReadOnly && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${item.name}`}
              title="Editar"
              className={`rounded-lg text-text-secondary hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800 ${
                focusMode ? "p-3" : "p-2"
              }`}
            >
              <Pencil
                className={focusMode ? "h-6 w-6" : "h-4 w-4"}
                aria-hidden
              />
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              aria-label={`Eliminar ${item.name}`}
              title="Eliminar"
              className={`rounded-lg text-text-secondary hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-red-950 dark:hover:text-red-400 ${
                focusMode ? "p-3" : "p-2"
              }`}
            >
              <Trash2
                className={focusMode ? "h-6 w-6" : "h-4 w-4"}
                aria-hidden
              />
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
            setDeleting(true);
            window.setTimeout(() => {
              deleteItem(listId, item.id);
              setDeleting(false);
            }, 150);
          }
          setDeleteOpen(false);
        }}
      />
    </li>
  );
}
