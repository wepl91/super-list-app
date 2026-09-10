/**
 * Detección pura de swipe sobre un eje horizontal dominante.
 * Convención (iOS): derecha = completar, izquierda = desmarcar.
 */

export type SwipeDirection = "left" | "right";

/** Umbral mínimo de desplazamiento horizontal (~64px en pantallas móviles). */
export const DEFAULT_SWIPE_THRESHOLD = 64;

/**
 * Devuelve la dirección del swipe solo si el desplazamiento horizontal excede
 * el umbral y domina al vertical (`|dx| > |dy|`), para no competir con el
 * scroll de la página.
 */
export function detectSwipe(
  dx: number,
  dy: number,
  threshold: number = DEFAULT_SWIPE_THRESHOLD
): SwipeDirection | null {
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  if (dx >= threshold) return "right";
  if (dx <= -threshold) return "left";
  return null;
}