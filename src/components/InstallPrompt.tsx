"use client";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

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

  if (!hydrated) {
    return null;
  }

  if (isStandalone) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
      <h3 className="mb-1 text-sm font-semibold">Instala la app</h3>
      <p className="text-sm text-text-secondary">
        Añádela a tu pantalla de inicio para usarla como una app.
      </p>
      {isIOS && (
        <p className="mt-2 text-xs text-text-secondary">
          En iOS, toca el botón de compartir y luego{" "}
          <span className="italic">Añadir a pantalla de inicio</span>.
        </p>
      )}
    </div>
  );
}
