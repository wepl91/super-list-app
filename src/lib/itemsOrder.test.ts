import { describe, it, expect } from "vitest";
import {
  reorderItems,
  splitPinned,
  applyTogglePin,
} from "./itemsOrder";
import type { ListItem } from "./types";

function item(id: string, over: Partial<ListItem> = {}): ListItem {
  return {
    id,
    name: id,
    quantity: 1,
    completed: false,
    position: 0,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

const fixture: ListItem[] = [
  item("a", { completed: false }),
  item("b", { completed: false }),
  item("c", { completed: false }),
  item("d", { completed: true }),
  item("e", { completed: true }),
];

describe("reorderItems", () => {
  it("reordena dentro del grupo de pendientes y reasigna positions", () => {
    const next = reorderItems(fixture, "a", "c");
    expect(next.map((i) => i.id)).toEqual(["b", "c", "a", "d", "e"]);
    expect(next.map((i) => i.position)).toEqual([0, 1, 2, 3, 4]);
    expect(next[2]).toMatchObject({ id: "a", completed: false });
    expect(next[3]).toMatchObject({ id: "d", completed: true });
  });

  it("mover un item hacia atrás en su grupo", () => {
    const next = reorderItems(fixture, "c", "a");
    expect(next.map((i) => i.id)).toEqual(["c", "a", "b", "d", "e"]);
  });

  it("reordena dentro del grupo de completados sin tocar el otro grupo", () => {
    const next = reorderItems(fixture, "d", "e");
    expect(next.map((i) => i.id)).toEqual(["a", "b", "c", "e", "d"]);
    expect(next[4]).toMatchObject({ id: "d", completed: true });
  });

  it("crossing groups es no-op (no mezcla pendientes con completados)", () => {
    const next = reorderItems(fixture, "a", "e");
    expect(next).toBe(fixture);
  });

  it("mismo item es no-op", () => {
    const next = reorderItems(fixture, "a", "a");
    expect(next).toBe(fixture);
  });

  it("ids inexistentes son no-op", () => {
    expect(reorderItems(fixture, "zz", "c")).toBe(fixture);
    expect(reorderItems(fixture, "a", "zz")).toBe(fixture);
    expect(reorderItems(fixture, "zz", "zz")).toBe(fixture);
  });

  it("no muta el array original", () => {
    const before = fixture.map((i) => i.id).join("");
    reorderItems(fixture, "a", "c");
    expect(fixture.map((i) => i.id).join("")).toBe(before);
  });
});

describe("splitPinned", () => {
  it("separa fijados (ordenados) del resto", () => {
    const items = [item("a"), item("b", { pinned: true, position: 2 }), item("c", { pinned: true, position: 0 })];
    const { pinned, rest } = splitPinned(items);
    expect(pinned.map((i) => i.id)).toEqual(["c", "b"]);
    expect(rest.map((i) => i.id)).toEqual(["a"]);
  });

  it("sin fijados devuelve solo rest", () => {
    const { pinned, rest } = splitPinned(fixture);
    expect(pinned).toEqual([]);
    expect(rest.length).toBe(fixture.length);
  });
});

describe("applyTogglePin", () => {
  it("alterna pinned y actualiza updatedAt", () => {
    const next = applyTogglePin(fixture, "a");
    expect(next.find((i) => i.id === "a")?.pinned).toBe(true);
    expect(next.find((i) => i.id === "b")).toBe(fixture[1]);
  });

  it("desfija un item ya fijado", () => {
    const pinned = applyTogglePin(fixture, "a");
    const unpinned = applyTogglePin(pinned, "a");
    expect(unpinned.find((i) => i.id === "a")?.pinned).toBe(false);
  });

  it("id inexistente no cambia la referencia", () => {
    expect(applyTogglePin(fixture, "zz")).toBe(fixture);
  });
});