"use client";

import { useScreenWakeLock } from "@/lib/useScreenWakeLock";

/**
 * Mantiene la pantalla encendida mientras la app está abierta y visible.
 * No renderiza nada: es un componente de efecto.
 */
export default function ScreenKeepAwake() {
  useScreenWakeLock();
  return null;
}