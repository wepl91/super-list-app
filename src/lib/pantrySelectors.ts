import type { PantryItem } from "./types";
import { normalizeProductName } from "./productNames";

/** Cap máximo de productos guardados; ante exceso se evicta por LRU. */
export const PANTRY_CAP = 500;

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Nombre "de vidriera": colapsa espacios interiores pero conserva el casing
 * con el que el usuario lo escribió (lo que se muestra en chips y listados).
 * La deduplicación, en cambio, usa la clave normalizada (`normalizeProductName`).
 */
function displayNameOf(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function findByNormalizedName(
  products: PantryItem[],
  normalized: string
): PantryItem | undefined {
  return products.find((p) => normalizeProductName(p.name) === normalized);
}

/**
 * Sugerencias de productos: coincidencia `includes` sobre el nombre
 * normalizado (dedupe real), ordenadas por frecuencia (`count desc,
 * lastUsedAt desc`) y cortadas en `limit`. Con query vacío devuelve los más
 * frecuentes.
 */
export function suggestProducts(
  products: PantryItem[],
  query: string,
  limit = 6
): PantryItem[] {
  const q = normalizeProductName(query);
  return [...products]
    .filter((p) => normalizeProductName(p.name).includes(q))
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
  const display = displayNameOf(name);
  if (!display) return products;
  const normalized = normalizeProductName(display);
  const existing = findByNormalizedName(products, normalized);
  const now = Date.now();
  const next = existing
    ? products.map((p) =>
        p.id === existing.id ? { ...p, count: p.count + 1, lastUsedAt: now } : p
      )
    : [...products, { id: newId(), name: display, count: 1, lastUsedAt: now }];
  return evictToCap(next);
}

/** Alta/edición manual de un producto de la despensa. */
export function upsertProductEntry(
  products: PantryItem[],
  input: { id?: string; name: string; emoji?: string; aisle?: string; brand?: string }
): PantryItem[] {
  const display = displayNameOf(input.name);
  if (!display) return products;
  const normalized = normalizeProductName(input.name);
  const existing =
    (input.id && products.find((p) => p.id === input.id)) ??
    findByNormalizedName(products, normalized);
  if (existing) {
    return evictToCap(
      products.map((p) =>
        p.id === existing.id
          ? { ...p, name: display, emoji: input.emoji, aisle: input.aisle, brand: input.brand }
          : p
      )
    );
  }
  return evictToCap([
    ...products,
    {
      id: newId(),
      name: display,
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