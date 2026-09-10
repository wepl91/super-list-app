"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import BarcodeScannerButton from "@/components/BarcodeScannerButton";
import VoiceDictationButton from "@/components/VoiceDictationButton";
import { haptic } from "@/lib/haptics";
import { isRawBarcode } from "@/lib/barcodes";
import { lookupProductName } from "@/lib/barcodeLookup";
import { useBarcodes } from "@/lib/stores/barcodeStore";
import { useListStore } from "@/lib/stores/listStore";
import type { NewItemInput } from "@/lib/stores/listStore";

const LOOKUP_FAILED_MESSAGE = "No se pudo encontrar el producto.";

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
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
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

  useEffect(() => {
    if (!snackbar) return;
    const t = setTimeout(() => setSnackbar(null), 3500);
    return () => clearTimeout(t);
  }, [snackbar]);

  function resetForm() {
    setName("");
    setDescription("");
    setQuantity(1);
    setUnit("");
    setLastScannedCode(null);
    setLookupLoading(false);
  }

  function handleDetected(code: string) {
    setLastScannedCode(code);
    const known = useBarcodes.getState().getBarcodeName(code);
    if (known) {
      setName(known);
      return;
    }
    setSnackbar(null);
    setLookupLoading(true);
    void lookupProductName(code).then((name) => {
      setLookupLoading(false);
      if (!name) {
        // No se pudo resolver: snackbar rojo y el campo queda vacío para
        // cargar a mano o por voz.
        setSnackbar(LOOKUP_FAILED_MESSAGE);
        return;
      }
      // Solo aplicamos el nombre si el usuario no empezó a escribir/dictar
      // mientras tanto; si ya lo hizo, respetamos su texto.
      setName((current) => {
        if (current.trim() !== "") return current;
        useBarcodes.getState().setBarcodeName(code, name.trim());
        return name;
      });
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !listId) return;
    const code = lastScannedCode;
    // Aprendizaje: si el usuario agregó el item con un nombre de producto
    // (distinto del código cruto), persistimos el mapeo código → nombre.
    if (code && !isRawBarcode(name, code)) {
      useBarcodes.getState().setBarcodeName(code, name.trim());
    }
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
            <BarcodeScannerButton onDetect={handleDetected} />
            {lookupLoading && (
              <span
                role="status"
                aria-live="polite"
                className="flex shrink-0 items-center gap-1 text-xs text-text-secondary"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="sr-only">Buscando producto…</span>
              </span>
            )}
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
            <BarcodeScannerButton onDetect={handleDetected} />
            {lookupLoading && (
              <span
                role="status"
                aria-live="polite"
                className="flex shrink-0 items-center gap-1 text-xs text-text-secondary"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="sr-only">Buscando producto…</span>
              </span>
            )}
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
      {snackbar && (
        <div
          role="alert"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          {snackbar}
        </div>
      )}
    </form>
    </div>
  );
}