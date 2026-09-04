"use client";

/** Patrones de vibración predefinidos para microinteracciones. */
export const Haptics = {
  /** Toggle/completar un elemento. Corto y neutro. */
  toggle: [12],
  /** Acción destructiva (eliminar). Dos pulsos cortos. */
  delete: [20, 40, 20],
  /** Feedback de éxito/confirmación. Doble pulso. */
  success: [10, 30, 10],
} as const;

export type HapticPattern = number | number[] | keyof typeof Haptics;

function resolve(pattern: HapticPattern): number | number[] {
  if (typeof pattern === "string") return [...Haptics[pattern]];
  return pattern;
}

/** Vibración de respuesta táctil. No-op en navegadores sin soporte (iOS).
 * Usada en el modo foco para feedback al completar/agregar elementos.
 * Acepta un patrón numérico, un array de pulsos o una clave de `Haptics`. */
export function haptic(pattern: HapticPattern = 10) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(resolve(pattern));
  } catch {
    // sin soporte: no-op
  }
}