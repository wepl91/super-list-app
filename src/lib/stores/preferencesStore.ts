"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Preferencias locales del dispositivo (se persisten en localStorage y NO se
 * sincronizan entre cuentas ni dispositivos): modo foco, ocultar tachados…
 */
interface PreferencesState {
  focusMode: boolean;
  hideCompleted: boolean;
  setFocusMode: (value: boolean) => void;
  setHideCompleted: (value: boolean) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      focusMode: false,
      hideCompleted: false,
      setFocusMode: (value) => set({ focusMode: value }),
      setHideCompleted: (value) => set({ hideCompleted: value }),
    }),
    {
      name: "super-list-preferences",
    }
  )
);