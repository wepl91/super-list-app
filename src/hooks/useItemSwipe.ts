"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { detectSwipe } from "@/lib/gestures";

export interface ItemSwipeOptions {
  /** Sin sesión: no se rastrea ni se ejecuta acción. */
  disabled?: boolean;
  /** Devuelve true para ignorar el gesto cuando empieza en ese target (ej. un botón). */
  ignore?: (target: Element) => boolean;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

export interface ItemSwipe {
  /** Desplazamiento horizontal del dedo (feedback en vivo durante el gesto). */
  offsetX: number;
  /** True mientras el gesto horizontal está en curso. */
  swiping: boolean;
  reset: () => void;
}

/**
 * Swipe horizontal sobre una fila (Pointer Events nativos). El `touch-action:
 * pan-y` de la fila deja el scroll vertical al navegador y nos entrega solo el
 * gesto horizontal; la dominancia `|dx| > |dy|` evita fricciones con scroll.
 */
export function useItemSwipe(options: ItemSwipeOptions): ItemSwipe & {
  onPointerDown: (e: ReactPointerEvent) => void;
} {
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const startRef = useRef<{ x: number; y: number; id: number } | null>(null);
  const optsRef = useRef(options);
  useEffect(() => {
    optsRef.current = options;
  });

  function onPointerDown(e: ReactPointerEvent) {
    const { disabled, ignore } = optsRef.current;
    if (disabled) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const target = e.target as Element;
    if (ignore && ignore(target)) return;
    startRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  // Los listenents de gesto viven en window para no perder el track si el
  // dedo sale del nodo; se lean las opciones por ref para enlazarse una vez.
  useEffect(() => {
    function finish(e: PointerEvent, direction: "left" | "right" | null) {
      if (startRef.current === null || startRef.current.id !== e.pointerId) return;
      startRef.current = null;
      setSwiping(false);
      setOffsetX(0);
      if (direction && !optsRef.current.disabled) {
        const fn =
          direction === "right"
            ? optsRef.current.onSwipeRight
            : optsRef.current.onSwipeLeft;
        fn?.();
      }
    }

    function onMove(e: PointerEvent) {
      const start = startRef.current;
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > Math.abs(dy)) {
        setSwiping(true);
        setOffsetX(dx);
      }
    }

    function onUp(e: PointerEvent) {
      const start = startRef.current;
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      finish(e, detectSwipe(dx, dy));
    }

    function onCancel(e: PointerEvent) {
      if (!startRef.current || startRef.current.id !== e.pointerId) return;
      finish(e, null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  return {
    offsetX,
    swiping,
    onPointerDown,
    reset: () => {
      startRef.current = null;
      setSwiping(false);
      setOffsetX(0);
    },
  };
}