"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Máximo de mapeos código → nombre persistidos (evicción FIFO) para no
 *  exceder la cuota de localStorage. */
const MAX_CODES = 2000;

interface BarcodeState {
  /** Mapa código normalizado → nombre de producto (local, NO sincronizado). */
  codes: Record<string, string>;
  getBarcodeName: (code: string) => string | undefined;
  setBarcodeName: (code: string, name: string) => void;
}

/**
 * Mapa local de códigos de barras aprendidos. Se persiste en localStorage
 * (offline, por dispositivo) y NO se sincroniza entre cuentas ni dispositivos.
 */
export const useBarcodes = create<BarcodeState>()(
  persist(
    (set, get) => ({
      codes: {},
      getBarcodeName: (code) => get().codes[code],
      setBarcodeName: (code, name) =>
        set((state) => {
          const next = { ...state.codes };
          // Re-insertamos como última clave: las keys de objeto preservan el
          // orden de inserción, base del FIFO para la evicción.
          delete next[code];
          next[code] = name;
          const keys = Object.keys(next);
          if (keys.length > MAX_CODES) {
            for (const k of keys.slice(0, keys.length - MAX_CODES)) {
              delete next[k];
            }
          }
          return { codes: next };
        }),
    }),
    { name: "super-list-barcodes" }
  )
);