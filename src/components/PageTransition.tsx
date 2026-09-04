"use client";

import type { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/** Transición de entrada (fade + slide) del contenido de cada pantalla.
 * Respeta `prefers-reduced-motion` vía la utilidad `animate-fade-in`. */
export default function PageTransition({ children }: PageTransitionProps) {
  return <div className="animate-fade-in">{children}</div>;
}