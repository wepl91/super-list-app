"use client";

export type ListFilter = "all" | "pending" | "done";

interface ListFilterChipsProps {
  filter: ListFilter;
  onChange: (filter: ListFilter) => void;
  focusMode?: boolean;
}

const FILTERS: { value: ListFilter; label: string }[] = [
  { value: "all", label: "Todo" },
  { value: "pending", label: "Pendientes" },
  { value: "done", label: "Tachados" },
];

/**
 * Filtro temporal (por dispositivo y sesión de navegación) sobre el listado
 * del detalle. No se persiste ni sincroniza.
 */
export default function ListFilterChips({
  filter,
  onChange,
  focusMode = false,
}: ListFilterChipsProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar elementos"
      className="flex gap-1 rounded-full border border-zinc-200 bg-surface p-1 dark:border-zinc-700"
    >
      {FILTERS.map(({ value, label }) => {
        const active = value === filter;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={active}
            className={`flex-1 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              focusMode ? "px-4 py-3 text-base" : "px-3 py-1.5"
            } ${
              active
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}