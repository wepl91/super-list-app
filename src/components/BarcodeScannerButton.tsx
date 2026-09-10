"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanBarcode, X } from "lucide-react";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";

interface BarcodeScannerButtonProps {
  onDetect?: (code: string) => void;
}

/**
 * Botón de escáner de códigos de barras para el form de agregar elemento.
 * Abre un overlay con la cámara trasera; al detectar un código invoca
 * `onDetect(rawValue)` y se cierra. Sin `BarcodeDetector` (Safari/Firefox)
 * no se renderiza nada (feature detection). Todo local, sin grabación.
 */
export default function BarcodeScannerButton({
  onDetect,
}: BarcodeScannerButtonProps) {
  const { supported, status, error, open, close, clearError, videoRef } =
    useBarcodeScanner({
      onDetect: (code) => {
        onDetect?.(code);
        setIsOpen(false);
        close();
      },
    });
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    close();
    toggleRef.current?.focus();
  }, [close]);

  const handleOpen = useCallback(() => {
    clearError();
    setIsOpen(true);
    void open();
  }, [clearError, open]);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  if (!supported) return null;

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
        aria-pressed={isOpen}
        aria-label="Escanear código de barras"
        title="Escanear código de barras"
        className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <ScanBarcode className="h-5 w-5" aria-hidden />
      </button>
      <video
        ref={videoRef}
        data-testid="scanner-video"
        hidden={!isOpen}
        autoPlay
        muted
        playsInline
        aria-hidden
        className="fixed inset-0 z-50 h-full w-full bg-black object-contain"
      />
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escáner de códigos de barras"
          className="fixed inset-0 z-50 flex flex-col items-center gap-3 p-4"
        >
          <p
            role="status"
            className="mt-24 text-sm font-medium text-white drop-shadow"
          >
            {status === "opening"
              ? "Abriendo cámara…"
              : "Apuntá a un código de barras"}
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </p>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            className="mt-auto flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" aria-hidden />
            Cerrar
          </button>
        </div>
      )}
    </>
  );
}