"use client";

export const OPEN_LOGIN_EVENT = "super-list:open-login";

/**
 * Dispara un evento para que UserMenu abra su modal de inicio de sesión.
 * Se usa desde los CTA de "sesión obligatoria para escribir" repartidos por
 * la UI (Home, ListCard, detalle de lista, compartir, etc.).
 */
export function openLoginModal() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LOGIN_EVENT));
}
