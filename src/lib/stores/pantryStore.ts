"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PantryItem } from "../types";
import {
  recordProduct,
  removeProductEntry,
  upsertProductEntry,
} from "../pantrySelectors";

/**
 * Catálogo personal "Mi despensa": 100% local del dispositivo (localStorage),
 * sin sincronización ni compartir entre cuentas. Se auto-alimenta desde lo
 * que el usuario agrega en los detalles (recordItem) y se edita a mano.
 *
 * Todas las mutaciones van con try/catch para que un fallo de storage (p. ej.
 * QuotaExceededError) nunca rompa el flujo de alta de un item.
 */
interface PantryState {
  products: PantryItem[];
  recordItem: (name: string) => void;
  upsertProduct: (input: {
    id?: string;
    name: string;
    emoji?: string;
    aisle?: string;
    brand?: string;
  }) => void;
  removeProduct: (id: string) => void;
}

export const usePantry = create<PantryState>()(
  persist(
    (set) => ({
      products: [],
      recordItem: (name) => {
        try {
          set((state) => ({ products: recordProduct(state.products, name) }));
        } catch (err) {
          console.error("Error registrando producto en la despensa:", err);
        }
      },
      upsertProduct: (input) => {
        try {
          set((state) => ({
            products: upsertProductEntry(state.products, input),
          }));
        } catch (err) {
          console.error("Error guardando producto de la despensa:", err);
        }
      },
      removeProduct: (id) => {
        try {
          set((state) => ({
            products: removeProductEntry(state.products, id),
          }));
        } catch (err) {
          console.error("Error eliminando producto de la despensa:", err);
        }
      },
    }),
    { name: "super-list-pantry" }
  )
);