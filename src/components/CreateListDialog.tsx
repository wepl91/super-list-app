"use client";

import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { useListStore } from "@/lib/stores/listStore";
import VoiceDictationButton from "@/components/VoiceDictationButton";

interface CreateListDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function CreateListDialog({
  open,
  onClose,
  onCreated,
}: CreateListDialogProps) {
  const createList = useListStore((s) => s.createList);
  const [name, setName] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName("");
      setVoiceError(null);
    }
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createList(trimmed);
    if (id) {
      haptic("success");
      onCreated(id);
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-list-title"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-zinc-200 bg-background p-5 shadow-xl dark:border-zinc-700">
        <h2 id="create-list-title" className="text-base font-semibold">
          Nueva lista
        </h2>
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="flex items-center gap-2">
            <label htmlFor="create-list-name" className="sr-only">
              Nombre de la lista
            </label>
            <input
              id="create-list-name"
              ref={inputRef}
              type="text"
              placeholder="Nombre de la lista"
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
          {voiceError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {voiceError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}