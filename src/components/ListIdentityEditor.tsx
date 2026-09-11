"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Palette, X } from "lucide-react";
import type { List, ListColor } from "@/lib/types";
import { useListStore } from "@/lib/stores/listStore";
import {
  LIST_COLORS,
  LIST_COLOR_LABELS,
  LIST_EMOJIS,
  defaultColorFor,
  normalizeEmoji,
  colorChipClass,
  colorSwatchClass,
} from "@/lib/listIdentity";

interface ListIdentityEditorProps {
  list: List;
  open: boolean;
  onClose: () => void;
}

export default function ListIdentityEditor({
  list,
  open,
  onClose,
}: ListIdentityEditorProps) {
  const setListIdentity = useListStore((s) => s.setListIdentity);
  // Los padres montan el editor solo cuando open=true, así que el estado
  // local parte siempre de la identidad actual de la lista (sin reseteo en effect).
  const [color, setColor] = useState<ListColor>(() =>
    list.color ?? defaultColorFor(list.id)
  );
  const [emoji, setEmoji] = useState(list.emoji ?? "");
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleSave() {
    const normalized = emoji.trim() ? normalizeEmoji(emoji) : undefined;
    if (emoji.trim() && !normalized) {
      setError("Ese no parece un único emoji. Probá con otro.");
      return;
    }
    setListIdentity(list.id, { color, emoji: normalized });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-title"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative max-h-[90vh] w-full max-w-sm animate-slide-up overflow-y-auto rounded-2xl border border-zinc-200 bg-background p-5 shadow-xl dark:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <h2
            id="identity-title"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <Palette className="h-4 w-4 text-text-secondary" aria-hidden />
            Personalizar lista
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mb-4 mt-1 truncate text-xs text-text-secondary">
          {list.name}
        </p>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Color</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Color">
            {LIST_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={color === c}
                aria-label={`Color ${LIST_COLOR_LABELS[c]}`}
                title={LIST_COLOR_LABELS[c]}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  colorSwatchClass(c)
                } ${
                  color === c
                    ? "ring-2 ring-zinc-900 ring-offset-2 dark:ring-zinc-100 dark:ring-offset-background"
                    : ""
                }`}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium">Emoji</legend>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              aria-pressed={!emoji}
              onClick={() => {
                setEmoji("");
                setError(null);
              }}
              className={`rounded-lg border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                !emoji
                  ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              Sin emoji
            </button>
            {LIST_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={emoji === e}
                aria-label={`Emoji ${e}`}
                onClick={() => {
                  setEmoji(e);
                  setError(null);
                }}
                className={`rounded-lg px-1.5 py-1 text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  emoji === e ? colorChipClass(color) : ""
                }`}
              >
                <span aria-hidden>{e}</span>
              </button>
            ))}
          </div>
          <label className="mt-3 block text-xs text-text-secondary" htmlFor="identity-emoji">
            O escribí otro emoji
          </label>
          <input
            id="identity-emoji"
            type="text"
            value={emoji}
            onChange={(e) => {
              setEmoji(e.target.value);
              setError(null);
            }}
            placeholder="🛒"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700"
          />
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
          >
            <Check className="h-4 w-4" aria-hidden />
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}