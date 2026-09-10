import { describe, it, expect } from "vitest";
import {
  LIST_COLORS,
  LIST_EMOJIS,
  defaultColorFor,
  normalizeEmoji,
  parseColor,
  colorBorderClass,
  colorChipClass,
  colorSwatchClass,
  effectiveColor,
} from "./listIdentity";

describe("defaultColorFor", () => {
  it("es determinístico: mismo id siempre da el mismo color", () => {
    expect(defaultColorFor("abc")).toBe(defaultColorFor("abc"));
    expect(defaultColorFor("lista-123")).toBe(defaultColorFor("lista-123"));
  });

  it("siempre devuelve un color de la paleta", () => {
    for (const id of ["a", "b", "c", "l1", "supermercado", "x".repeat(200)]) {
      expect(LIST_COLORS).toContain(defaultColorFor(id));
    }
  });

  it("distribuye ids distintos dentro de la paleta", () => {
    const seen = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => defaultColorFor(id))
    );
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("normalizeEmoji", () => {
  it("recorta espacios y devuelve el emoji", () => {
    expect(normalizeEmoji("  🛒  ")).toBe("🛒");
  });

  it("undefined/empty/null-string → undefined", () => {
    expect(normalizeEmoji(undefined)).toBeUndefined();
    expect(normalizeEmoji("")).toBeUndefined();
    expect(normalizeEmoji("   ")).toBeUndefined();
  });

  it("rechaza secuencias de más de 2 code points", () => {
    expect(normalizeEmoji("abc")).toBeUndefined();
    expect(normalizeEmoji("🇦🇷🇦🇷")).toBeUndefined();
  });

  it("rechaza espacios interiores", () => {
    expect(normalizeEmoji("🛒 🧾")).toBeUndefined();
  });

  it("acepta pares de code points simples (ej. bandera de 2 regiones)", () => {
    expect(normalizeEmoji("🇦🇷")).toBe("🇦🇷");
  });
});

describe("parseColor", () => {
  it("acepta colores de la paleta", () => {
    expect(parseColor("emerald")).toBe("emerald");
    expect(parseColor("teal")).toBe("teal");
  });

  it("rechaza valores inválidos o vacíos", () => {
    expect(parseColor("red")).toBeUndefined();
    expect(parseColor(null)).toBeUndefined();
    expect(parseColor(undefined)).toBeUndefined();
    expect(parseColor("")).toBeUndefined();
  });
});

describe("lookups de clases", () => {
  it("colorBorderClass devuelve la clase literal esperada", () => {
    expect(colorBorderClass("rose")).toContain("border-rose-500");
    expect(colorBorderClass("emerald")).toContain("border-emerald-500");
  });

  it("colorChipClass devuelve una clase de fondo (nunca de texto)", () => {
    expect(colorChipClass("sky")).toContain("bg-sky-");
    expect(colorChipClass("violet")).not.toContain("text-");
  });

  it("colorSwatchClass devuelve un fondo sólido por color", () => {
    expect(colorSwatchClass("teal")).toBe("bg-teal-500");
    expect(colorSwatchClass("emerald")).toBe("bg-emerald-500");
  });
});

describe("effectiveColor", () => {
  it("usa el color propio cuando es válido", () => {
    expect(effectiveColor({ id: "abc", color: "amber" })).toBe("amber");
  });

  it("cae al default por id cuando no hay color válido", () => {
    const list = { id: "abc", color: undefined };
    expect(effectiveColor(list)).toBe(defaultColorFor("abc"));
    expect(effectiveColor({ id: "abc", color: "rojo" as never })).toBe(
      defaultColorFor("abc")
    );
  });
});

describe("lista de emojis", () => {
  it("contiene emojis únicos y al menos 20 opciones", () => {
    expect(new Set(LIST_EMOJIS).size).toBe(LIST_EMOJIS.length);
    expect(LIST_EMOJIS.length).toBeGreaterThanOrEqual(20);
  });
});