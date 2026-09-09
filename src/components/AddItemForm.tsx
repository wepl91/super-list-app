"use client";

import { useEffect, useRef, useState } from "react";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { haptic } from "@/lib/haptics";
import { useListStore } from "@/lib/stores/listStore";
import type { NewItemInput } from "@/lib/stores/listStore";

interface AddItemFormProps {
  listId: string;
  focusMode: boolean;
  closing: boolean;
  onClose: () => void;
  onExited: () => void;
}

export default function AddItemForm({
  listId,
  focusMode,
  closing,
  onClose,
  onExited,
}: AddItemFormProps) {
  const addItem = useListStore((s) => s.addItem);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [entering, setEntering] = useState(true);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    nameRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (closing) nameRef.current?.blur();
  }, [closing]);

  function resetForm() {
    setName("");
    setDescription("");
    setQuantity(1);
    setUnit("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !listId) return;
    const input: NewItemInput = { name, description, quantity, unit };
    addItem(listId, input);
    if (focusMode) haptic();
    resetForm();
  }

  return (
    <div
      className={`collapse-form ${
        !entering && !closing ? "collapse-form-open" : ""
      } ${closing ? "pointer-events-none" : ""}`}
      aria-hidden={closing}
      onTransitionEnd={(e) => {
        if (closing && e.target === e.currentTarget) onExited();
      }}
    >
    <form
      id="add-item-form"
      onSubmit={handleAdd}
      aria-label="Añadir elemento"
      style={closing ? { padding: 0 } : undefined}
      className={`flex flex-col gap-2 rounded-xl border border-zinc-200 bg-surface ${
        focusMode ? "p-4" : "p-3"
      } dark:border-zinc-700`}
    >
      {focusMode ? (
        <>
          <label htmlFor="item-name-focus" className="sr-only">
            Nombre del elemento
          </label>
          <div className="flex items-center gap-2">
            <input
              id="item-name-focus"
              ref={nameRef}
              type="text"
              placeholder="Agregar elemento..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-lg text-foreground placeholder:text-placeholder dark:border-zinc-700"
            />
            <VoiceDictationButton
              onInterim={setName}
              onFinal={setName}
              onError={(msg) => setVoiceError(msg)}
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-3 text-lg text-white hover:opacity-90"
          >
            Agregar
          </button>
        </>
      ) : (
        <>
          <label htmlFor="item-name" className="sr-only">
            Nombre del elemento
          </label>
          <div className="flex items-center gap-2">
            <input
              id="item-name"
              ref={nameRef}
              type="text"
              placeholder="Elemento..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
            />
            <VoiceDictationButton
              onInterim={setName}
              onFinal={setName}
              onError={(msg) => setVoiceError(msg)}
            />
          </div>
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
              min={0}
              step="0.01"
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.max(0, Number(e.target.value) || 0))
              }
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
        </>
      )}
      {voiceError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {voiceError}
        </p>
      )}
    </form>
    </div>
  );
}