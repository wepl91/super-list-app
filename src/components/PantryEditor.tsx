"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { normalizeProductName } from "@/lib/productNames";
import { usePantry } from "@/lib/stores/pantryStore";
import type { PantryItem } from "@/lib/types";

interface ProductDialogProps {
  product: PantryItem | null;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    name: string;
    emoji?: string;
    aisle?: string;
    brand?: string;
  }) => void;
}

function ProductDialog({ product, onClose, onSave }: ProductDialogProps) {
  const idPrefix = useId();
  const [name, setName] = useState(product?.name ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "");
  const [aisle, setAisle] = useState(product?.aisle ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: product?.id,
      name,
      emoji: emoji.trim() || undefined,
      aisle: aisle.trim() || undefined,
      brand: brand.trim() || undefined,
    });
    onClose();
  }

  const inputClass =
    "rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-dialog-title"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-zinc-200 bg-background p-5 shadow-xl dark:border-zinc-700">
        <h2 id="product-dialog-title" className="text-base font-semibold">
          {product ? "Editar producto" : "Nuevo producto"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-pname`} className="sr-only">
              Nombre
            </label>
            <input
              id={`${idPrefix}-pname`}
              ref={nameRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              autoComplete="off"
              autoCorrect="off"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${idPrefix}-pemoji`} className="text-xs font-medium text-text-secondary">
              Emoji (opcional)
            </label>
            <input
              id={`${idPrefix}-pemoji`}
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🥛"
              autoComplete="off"
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${idPrefix}-paisle`} className="text-xs font-medium text-text-secondary">
                Pasillo (opcional)
              </label>
              <input
                id={`${idPrefix}-paisle`}
                type="text"
                value={aisle}
                onChange={(e) => setAisle(e.target.value)}
                placeholder="Lácteos"
                autoComplete="off"
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor={`${idPrefix}-pbrand`} className="text-xs font-medium text-text-secondary">
                Marca (opcional)
              </label>
              <input
                id={`${idPrefix}-pbrand`}
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="La Serenísima"
                autoComplete="off"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Editor manual del catálogo "Mi despensa". */
export default function PantryEditor() {
  const products = usePantry((s) => s.products);
  const upsertProduct = usePantry((s) => s.upsertProduct);
  const removeProduct = usePantry((s) => s.removeProduct);

  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PantryItem | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeProductName(query);
    return [...products]
      .filter((p) => p.name.includes(q))
      .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt);
  }, [products, query]);

  const isEmpty = products.length === 0;
  const noMatches = !isEmpty && filtered.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <label htmlFor="pantry-search" className="sr-only">
            Buscar en la despensa
          </label>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          />
          <input
            id="pantry-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            className="w-full rounded-lg border border-zinc-300 bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="Agregar producto"
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:opacity-90"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Agregar
        </button>
      </div>

      {isEmpty && (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-surface p-4 text-center text-sm text-text-secondary dark:border-zinc-700">
          Todavía no tenés productos en tu despensa. Se van guardando solos
          cuando agregás elementos a tus listas.
        </p>
      )}

      {noMatches && (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-surface p-4 text-center text-sm text-text-secondary dark:border-zinc-700">
          Sin resultados para &quot;{query}&quot;.
        </p>
      )}

      <ul className="flex flex-col gap-2" aria-label="Productos de la despensa">
        {filtered.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700"
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-lg dark:bg-zinc-800"
            >
              {p.emoji ?? "🛒"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground capitalize">
                {p.name}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {p.aisle ? `${p.aisle} · ` : ""}
                {p.brand ? `${p.brand} · ` : ""}
                {p.count === 1
                  ? "1 uso"
                  : `${p.count} usos`}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Editar ${p.name}`}
              onClick={() => setEditing(p)}
              className="rounded-lg border border-zinc-300 p-2 text-text-secondary hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Edit aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${p.name}`}
              onClick={() => setDeleteTarget(p)}
              className="rounded-lg border border-zinc-300 p-2 text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:hover:bg-red-950"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>

      {(creating || editing) && (
        <ProductDialog
          product={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSave={upsertProduct}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar producto"
        message={
          <span>
            ¿Borrar <strong>{deleteTarget?.name}</strong> de tu despensa? Las
            listas no se modifican.
          </span>
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          if (deleteTarget) removeProduct(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}