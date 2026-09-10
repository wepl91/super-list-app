import { describe, it, expect } from "vitest";
import {
  suggestProducts,
  evictToCap,
  recordProduct,
  upsertProductEntry,
  removeProductEntry,
  PANTRY_CAP,
} from "./pantrySelectors";
import type { PantryItem } from "./types";

function product(overrides: Partial<PantryItem>): PantryItem {
  return {
    id: "p-" + (overrides.name ?? Math.random()),
    name: overrides.name ?? "x",
    count: 1,
    lastUsedAt: 0,
    ...overrides,
  };
}

describe("suggestProducts", () => {
  const products: PantryItem[] = [
    product({ name: "leche", count: 5, lastUsedAt: 100 }),
    product({ name: "leche entera", count: 2, lastUsedAt: 300 }),
    product({ name: "harina", count: 9, lastUsedAt: 50 }),
  ];

  it("filtra por coincidencia normalizada y ordena por count/lastUsedAt", () => {
    const hits = suggestProducts(products, "Leche", 10);
    expect(hits.map((p) => p.name)).toEqual(["leche", "leche entera"]);
  });

  it("query vacío devuelve los más frecuentes", () => {
    const hits = suggestProducts(products, "", 6);
    expect(hits.map((p) => p.name)).toEqual(["harina", "leche", "leche entera"]);
  });

  it("respeta el límite", () => {
    expect(suggestProducts(products, "", 2)).toHaveLength(2);
  });

  it("sin coincidencias devuelve []", () => {
    expect(suggestProducts(products, "zzz", 6)).toEqual([]);
  });
});

describe("evictToCap", () => {
  it("evicta por lastUsedAt cuando supera el cap", () => {
    const items = [
      product({ name: "a", lastUsedAt: 30 }),
      product({ name: "b", lastUsedAt: 10 }),
      product({ name: "c", lastUsedAt: 20 }),
    ];
    const capped = evictToCap(items, 2);
    expect(capped).toHaveLength(2);
    expect(capped.map((p) => p.name)).toEqual(["c", "a"]);
  });

  it("bajo el cap devuelve lo mismo", () => {
    const items = [product({ name: "a" }), product({ name: "b" })];
    expect(evictToCap(items, 5)).toHaveLength(2);
  });
});

describe("recordProduct", () => {
  it("crea el producto con count 1 ante un nombre nuevo", () => {
    const next = recordProduct([], " Leche ");
    expect(next[0]).toMatchObject({ name: "leche", count: 1 });
  });

  it("incrementa count y lastUsedAt si ya existe (deduplicado)", () => {
    const base = recordProduct([], "Leche");
    const next = recordProduct(base, "LECHE");
    expect(next).toHaveLength(1);
    expect(next[0].count).toBe(2);
    expect(next[0].lastUsedAt).toBeGreaterThanOrEqual(base[0].lastUsedAt);
  });

  it("nombre vacío es no-op", () => {
    expect(recordProduct([], "   ")).toEqual([]);
  });

  it("respeta el cap al crear", () => {
    const full = Array.from({ length: PANTRY_CAP }, (_, i) =>
      product({ name: `p${i}`, lastUsedAt: i })
    );
    const next = recordProduct(full, "nuevo");
    expect(next).toHaveLength(PANTRY_CAP);
    expect(next.some((p) => p.name === "p0")).toBe(false);
    expect(next.some((p) => p.name === "nuevo")).toBe(true);
  });
});

describe("upsertProductEntry", () => {
  it("edita un producto existente por id conservando count", () => {
    const base = recordProduct([], "leche");
    const { id } = base[0];
    const next = upsertProductEntry(base, { id, name: "leche entera", emoji: "🥛", aisle: "lácteos" });
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id, name: "leche entera", emoji: "🥛", aisle: "lácteos", count: 1 });
  });

  it("crea uno nuevo si no existe (count 0, es manual)", () => {
    const next = upsertProductEntry([], { name: "Huevos", brand: "Campo" });
    expect(next[0]).toMatchObject({ name: "huevos", brand: "Campo", count: 0 });
  });

  it("nombre vacío es no-op", () => {
    expect(upsertProductEntry([], { name: "" })).toEqual([]);
  });
});

describe("removeProductEntry", () => {
  it("elimina por id", () => {
    const base = recordProduct([], "leche");
    expect(removeProductEntry(base, base[0].id)).toEqual([]);
  });
});