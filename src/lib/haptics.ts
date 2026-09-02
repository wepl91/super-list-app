"use client";

/** Vibración de respuesta táctil. No-op en navegadores sin soporte (iOS).
 * Usada en el modo foco para feedback al completar/agregar elementos. */
export function haptic(pattern: number | number[] = 10) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // sin soporte: no-op
  }
}