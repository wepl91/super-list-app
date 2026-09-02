"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener: (type: "release", cb: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

/**
 * Mantiene la pantalla encendida mientras la app está visible (Screen Wake
 * Lock API). La API libera el lock sola al pasar a background; este hook lo
 * re-adquiere al volver a primer plano y ante una liberación inesperada.
 * Sin soporte (feature detection) no hace nada.
 */
export function useScreenWakeLock() {
  useEffect(() => {
    const nav = navigator as NavigatorWithWakeLock;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    async function acquire() {
      if (cancelled) return;
      try {
        sentinel = await nav.wakeLock!.request("screen");
        sentinel.addEventListener("release", () => {
          if (!cancelled) void acquire();
        });
      } catch {
        // Sin soporte o denegado: no-op silencioso.
      }
    }

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, []);
}