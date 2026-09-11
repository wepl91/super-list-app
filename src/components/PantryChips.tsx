"use client";

import { suggestProducts } from "@/lib/pantrySelectors";
import { usePantry } from "@/lib/stores/pantryStore";

interface PantryChipsProps {
  name: string;
  onPick: (name: string) => void;
}

/** Chips de productos frecuentes de la despensa para el alta de elementos. */
export default function PantryChips({ name, onPick }: PantryChipsProps) {
  const products = usePantry((s) => s.products);
  const suggestions = suggestProducts(products, name, 6);

  if (suggestions.length === 0) return null;

  return (
    <div
      aria-label="Sugerencias de tus productos"
      className="flex flex-wrap gap-1.5"
    >
      {suggestions.map((p) => (
        <button
          key={p.id}
          type="button"
          aria-label={`Usar ${p.name}`}
          onClick={() => onPick(p.name)}
          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {p.emoji && <span aria-hidden="true">{p.emoji}</span>}
          {p.name}
        </button>
      ))}
    </div>
  );
}