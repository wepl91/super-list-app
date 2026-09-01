"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useListStore } from "@/lib/stores/listStore";
import type { NewItemInput } from "@/lib/stores/listStore";
import { useHydrated } from "@/lib/useHydrated";
import ListItemRow from "@/components/ListItemRow";
import ThemeToggle from "@/components/ThemeToggle";
import ListOptionsMenu from "@/components/ListOptionsMenu";
import AddMemberForm from "@/components/AddMemberForm";
import AuthGateCta from "@/components/AuthGateCta";
import { useAuth } from "@/lib/supabase/auth";

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const list = useListStore((s) => s.lists.find((l) => l.id === id));
  const hydrated = useHydrated();
  const { user, status } = useAuth();
  const isSignedIn = status === "signedIn";

  const isOwner = !!user && !!list && list.ownerId === user.id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasList = list !== undefined;

  function resetForm() {
    setName("");
    setDescription("");
    setQuantity(1);
    setUnit("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !list) return;
    const input: NewItemInput = { name, description, quantity, unit };
    useListStore.getState().addItem(list.id, input);
    resetForm();
  }

  function handleSaveEdit(input: { name: string; description?: string; quantity: number; unit?: string }) {
    if (!list) return;
    useListStore.getState().updateItem(list.id, editingId!, input);
    setEditingId(null);
  }

  const hasCompleted = (list?.items ?? []).some((i) => i.completed);

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 p-6">
        <p className="text-sm text-text-secondary">
          Cargando...
        </p>
      </div>
    );
  }

  if (!hasList) {
    return (
      <div className="mx-auto w-full max-w-lg flex-1 p-6">
        <p className="text-sm text-text-secondary">
          Lista no encontrada.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  const completed = list.items.filter((i) => i.completed).length;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 p-6">
      <Link
        href="/"
        className="mb-4 inline-block text-sm font-medium text-primary hover:underline"
      >
        ← Volver
      </Link>

      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">{list.name}</h1>
          <p className="text-sm text-text-secondary">
            {list.items.length} elemento{list.items.length === 1 ? "" : "s"} ·{" "}
            {completed} completado{completed === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {isSignedIn && (
            <ListOptionsMenu
              onSort={() => useListStore.getState().sortItems(list.id)}
              onDeleteCompleted={() =>
                useListStore.getState().deleteCompletedItems(list.id)
              }
              hasCompleted={hasCompleted}
            />
          )}
          <ThemeToggle />
        </div>
      </header>

      {isSignedIn ? (
        <form
          onSubmit={handleAdd}
          className="mb-6 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700"
          aria-label="Añadir elemento"
        >
        <label htmlFor="item-name" className="sr-only">
          Nombre del elemento
        </label>
        <input
          id="item-name"
          type="text"
          placeholder="Elemento..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
        />
        <label htmlFor="item-desc" className="sr-only">
          Descripción (opcional)
        </label>
        <input
          id="item-desc"
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
        />
        <div className="flex gap-2">
          <label htmlFor="item-qty" className="sr-only">
            Cantidad
          </label>
          <input
            id="item-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-24 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground dark:border-zinc-700"
          />
          <label htmlFor="item-unit" className="sr-only">
            Unidad (opcional)
          </label>
          <input
            id="item-unit"
            type="text"
            placeholder="Unidad (kg, l...)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
        </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Añadir
          </button>
        </form>
      ) : (
        <div className="mb-6">
          <AuthGateCta />
        </div>
      )}

      {list.items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Esta lista está vacía. Añade el primer elemento.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.items.map((item) => (
            <ListItemRow
              key={item.id}
              listId={list.id}
              item={item}
              editing={editingId === item.id && isSignedIn}
              onEdit={() => setEditingId(item.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={handleSaveEdit}
              isReadOnly={!isSignedIn}
            />
          ))}
        </ul>
      )}

      {isOwner && isSignedIn && (
        <div className="mt-8">
          <AddMemberForm listId={list.id} />
        </div>
      )}
    </div>
  );
}
