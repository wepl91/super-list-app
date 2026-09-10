import type { ListColor } from "@/lib/types";

export const LIST_COLORS: ListColor[] = [
  "emerald",
  "sky",
  "amber",
  "rose",
  "violet",
  "teal",
];

/** Nombres legibles de la paleta, para accesibilidad (aria-label / title). */
export const LIST_COLOR_LABELS: Record<ListColor, string> = {
  emerald: "Esmeralda",
  sky: "Cielo",
  amber: "Ámbar",
  rose: "Rosa",
  violet: "Violeta",
  teal: "Teal",
};

/**
 * Emojis preseleccionados para el picker del editor. "Sin emoji" es una
 * opción explícita, así que no incluimos un placeholder.
 */
export const LIST_EMOJIS: string[] = [
  "🛒",
  "🧾",
  "🍎",
  "🍞",
  "🥛",
  "💊",
  "🛠",
  "👶",
  "🐾",
  "🎄",
  "🏖",
  "🎁",
  "🧴",
  "🧻",
  "🧹",
  "☘️",
  "🌻",
  "📦",
  "🔑",
  "🧩",
  "🎮",
  "📚",
  "👕",
  "🧸",
  "🍗",
  "🐟",
  "🍦",
  "🌶",
  "🥚",
  "🍫",
];

/**
 * Color default determinístico por id: mismo id → mismo color, estable entre
 * sesiones. Se usa al crear y como fallback si el server no trae color.
 */
export function defaultColorFor(id: string): ListColor {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return LIST_COLORS[h % LIST_COLORS.length];
}

/**
 * Normaliza un emoji: trim, máximo 2 code points (los emojis complejos con
 * secuencias ZWJ quedan fuera por diseño). Inválido/vacío → undefined.
 */
export function normalizeEmoji(emoji: string | undefined): string | undefined {
  if (!emoji) return undefined;
  const trimmed = emoji.trim();
  if (!trimmed) return undefined;
  // sin espacios interiores (un "🚗 🚕" no es un solo emoji decorativo)
  if (trimmed.includes(" ")) return undefined;
  if ([...trimmed].length > 2) return undefined;
  return trimmed;
}

/**
 * Valida un color que llega del server/DB con validación suave: si no es de
 * la paleta, undefined (el render cae al default por id).
 */
export function parseColor(color: string | null | undefined): ListColor | undefined {
  if (!color) return undefined;
  return LIST_COLORS.some((c) => c === color) ? (color as ListColor) : undefined;
}

/**
 * Clases "acento" aplicadas al contenedor (borde izquierdo). Los strings son
 * literales para que Tailwind no purgue las clases (nunca interpolados).
 */
export function colorBorderClass(color: ListColor): string {
  return {
    emerald: "border-l-4 border-emerald-500",
    sky: "border-l-4 border-sky-500",
    amber: "border-l-4 border-amber-500",
    rose: "border-l-4 border-rose-500",
    violet: "border-l-4 border-violet-500",
    teal: "border-l-4 border-teal-500",
  }[color];
}

/**
 * Fondo suave para el chip del emoji (y acentos). Sigue los mismos principios:
 * solo fondo, nunca color de texto (contraste).
 */
export function colorChipClass(color: ListColor): string {
  return {
    emerald: "bg-emerald-100/80 dark:bg-emerald-900/50",
    sky: "bg-sky-100/80 dark:bg-sky-900/50",
    amber: "bg-amber-100/80 dark:bg-amber-900/50",
    rose: "bg-rose-100/80 dark:bg-rose-900/50",
    violet: "bg-violet-100/80 dark:bg-violet-900/50",
    teal: "bg-teal-100/80 dark:bg-teal-900/50",
  }[color];
}

/** Fondo sólido del swatch (círculo de color) en el editor. */
export function colorSwatchClass(color: ListColor): string {
  return {
    emerald: "bg-emerald-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
    teal: "bg-teal-500",
  }[color];
}

/** Color efectivo de una lista: el propio si es válido, si no el default por id. */
export function effectiveColor(list: {
  id: string;
  color?: ListColor | undefined;
}): ListColor {
  return parseColor(list.color) ?? defaultColorFor(list.id);
}