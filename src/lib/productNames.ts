/**
 * Normalización de nombres de producto para deduplicar la despensa:
 * trim + colapso de espacios internos + lowercase. "leche", " Leche " y
 * "LECHE" colapsan en "leche".
 */
export function normalizeProductName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}