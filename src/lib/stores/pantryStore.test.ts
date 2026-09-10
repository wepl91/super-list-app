import { describe, it, expect, vi, beforeEach } from "vitest";
import { usePantry } from "./pantryStore";

beforeEach(() => {
  localStorage.clear();
  usePantry.setState({ products: [] });
});

describe("pantryStore", () => {
  it("recordItem crea un producto conservando el casing con count 1", () => {
    usePantry.getState().recordItem(" Leche ");
    expect(usePantry.getState().products).toHaveLength(1);
    expect(usePantry.getState().products[0]).toMatchObject({
      name: "Leche",
      count: 1,
    });
  });

  it("recordItem deduplica y acumula count", () => {
    const store = usePantry.getState();
    store.recordItem("Leche");
    store.recordItem("LECHE");
    store.recordItem("leche");
    const products = usePantry.getState().products;
    expect(products).toHaveLength(1);
    expect(products[0].count).toBe(3);
  });

  it("upsertProduct edita los metadatos y conserva count", () => {
    const { recordItem, upsertProduct } = usePantry.getState();
    recordItem("huevos");
    const existing = usePantry.getState().products[0];
    upsertProduct({ id: existing.id, name: "Huevos frescos", emoji: "🥚", aisle: "granja" });
    expect(usePantry.getState().products[0]).toMatchObject({
      id: existing.id,
      name: "Huevos frescos",
      emoji: "🥚",
      aisle: "granja",
      count: 1,
    });
  });

  it("removeProduct elimina por id", () => {
    const { recordItem, removeProduct } = usePantry.getState();
    recordItem("pan");
    const { id } = usePantry.getState().products[0];
    removeProduct(id);
    expect(usePantry.getState().products).toEqual([]);
  });

  it("persiste los productos en localStorage", () => {
    usePantry.getState().recordItem("aceite");
    const stored = JSON.parse(localStorage.getItem("super-list-pantry")!);
    expect(stored.state.products).toHaveLength(1);
    expect(stored.state.products[0].name).toBe("aceite");
  });

  it("evicta por el cap al registrar más productos del límite", () => {
    usePantry.setState({ products: [] });
    for (let i = 0; i < 501; i++) {
      usePantry.getState().recordItem(`producto ${i}`);
    }
    expect(usePantry.getState().products).toHaveLength(500);
    const names = usePantry.getState().products.map((p) => p.name);
    expect(names).not.toContain("producto 0");
    expect(names).toContain("producto 500");
  });

  it("un error de localStorage no rompe el flujo de alta", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => usePantry.getState().recordItem("leche")).not.toThrow();
    setItem.mockRestore();
    error.mockRestore();
  });
});