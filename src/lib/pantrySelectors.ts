import type { PantryItem } from "./types";
import { normalizeProductName } from "./productNames";

/** Cap máximo de productos guardados; ante exceso se evicta por LRU. */
export const PANTRY_CAP = 500;

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Sugerencias de productos: coincidencia `includes` sobre el nombre
 * normalizado, ordenadas por frecuencia (`count desc, lastUsedAt desc`) y
 * cortadas en `limit`. Con query vacío devuelve los más frecuentes.
 */
export function suggestProducts(
  products: PantryItem[],
  query: string,
  limit = 6
): PantryItem[] {
  const q = normalizeProductName(query);
  return [...products]
    .filter((p) => p.name.includes(q))
    .sort((a, b) => b.count - a.count || b.lastUsedAt - a.lastUsedAt)
    .slice(0, limit);
}

/** Evicción LRU por `lastUsedAt` cuando la lista excede la capacidad. */
export function evictToCap(products: PantryItem[], cap = PANTRY_CAP): PantryItem[] {
  if (products.length <= cap) return products;
  return [...products]
    .sort((a, b) => a.lastUsedAt - b.lastUsedAt)
    .slice(products.length - cap);
}

/** Registra un uso: incrementa `count`/`lastUsedAt` o crea el producto. */
export function recordProduct(products: PantryItem[], name: string): PantryItem[] {
  const normalized = normalizeProductName(name);
  if (!normalized) return products;
  const existing = products.find((p) => p.name === normalized);
  const now = Date.now();
  const next = existing
    ? products.map((p) =>
        p.id === existing.id ? { ...p, count: p.count + 1, lastUsedAt: now } : p
      )
    : [...products, { id: newId(), name: normalized, count: 1, lastUsedAt: now }];
  return evictToCap(next);
}

/** Alta/edición manual de un producto de la despensa. */
export function upsertProductEntry(
  products: PantryItem[],
  input: { id?: string; name: string; emoji?: string; aisle?: string; brand?: string }
): PantryItem[] {
  const name = normalizeProductName(input.name);
  if (!name) return products;
  const existing =
    (input.id && products.find((p) => p.id === input.id)) ??
    products.find((p) => p.name === name);
  if (existing) {
    return evictToCap(
      products.map((p) =>
        p.id === existing.id
          ? { ...p, name, emoji: input.emoji, aisle: input.aisle, brand: input.brand }
          : p
      )
    );
  }
  return evictToCap([
    ...products,
    {
      id: newId(),
      name,
      emoji: input.emoji,
      aisle: input.aisle,
      brand: input.brand,
      count: 0,
      lastUsedAt: Date.now(),
    },
  ]);
}

/** Elimina un producto del catálogo. */
export function removeProductEntry(products: PantryItem[], id: string): PantryItem[] {
  return products.filter((p) => p.id !== id);
}