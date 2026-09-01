"use client";

import { useState, useEffect, useCallback } from "react";
import { useHydrated } from "@/lib/useHydrated";

/**
 * Tipo no estandarizado del evento beforeinstallprompt (solo Chromium).
 * Se define localmente porque la interfaz W3C no está en los types de TS.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const hydrated = useHydrated();

  const [isIOS] = useState(
    () =>
      typeof window !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent)
  );

  const [isStandalone] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(display-mode: standalone)").matches
  );

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  const [canInstall, setCanInstall] = useState(false);

  const [copied, setCopied] = useState(false);

  // Escuchar beforeinstallprompt (solo Chromium)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  }, [deferredPrompt]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Silenciar errores (permiso denegado, etc.)
    }
  }, []);

  // Resetear feedback "Copiado!" después de 2s
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  // --- Render ---

  if (!hydrated) return null;
  if (isStandalone) return null;

  // iOS: paso a paso + copiar link
  if (isIOS) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
        <h3 className="mb-1 text-sm font-semibold">Instalá Super List</h3>
        <p className="mb-3 text-sm text-text-secondary">
          Seguí estos pasos para añadirla a tu pantalla de inicio:
        </p>
        <ol className="mb-3 list-inside list-decimal space-y-1 text-sm text-text-secondary">
          <li>
            Tocá el botón de{" "}
            <span className="font-medium">Compartir</span>{" "}
            <span className="text-xs">□↑</span> en la barra de abajo.
          </li>
          <li>
            Seleccioná{" "}
            <span className="italic">Añadir a pantalla de inicio</span>.
          </li>
          <li>
            Tocá <span className="font-medium">Añadir</span> para confirmar.
          </li>
        </ol>
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
        >
          {copied ? "¡Copiado!" : "Copiar link"}
        </button>
      </div>
    );
  }

  // Android/Chrome con prompt disponible
  if (canInstall) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
        <h3 className="mb-1 text-sm font-semibold">Instalá Super List</h3>
        <p className="mb-3 text-sm text-text-secondary">
          Añadila a tu pantalla para abrirla al toque.
        </p>
        <button
          type="button"
          onClick={handleInstall}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
        >
          Instalar app
        </button>
      </div>
    );
  }

  // Fallback: otros navegadores / Chrome sin prompt
  return (
    <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
      <h3 className="mb-1 text-sm font-semibold">Instalá Super List</h3>
      <p className="mb-3 text-sm text-text-secondary">
        Abrí esta URL en Chrome o Edge para instalarla como app.
      </p>
      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:active:bg-zinc-600"
      >
        {copied ? "¡Copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
