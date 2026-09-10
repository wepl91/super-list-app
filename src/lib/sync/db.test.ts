import { describe, it, expect } from "vitest";
import { toList, type ListRow } from "./db";

const row: ListRow = {
  id: "l1",
  owner_id: "u1",
  name: "Supermercado",
  position: 0,
  color: null,
  emoji: null,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

const rowDefault: ListRow = { ...row, id: "delta" };

describe("toList", () => {
  it("mapea role, ownerId y sharedMembers", () => {
    const list = toList(
      row,
      [],
      "owner",
      [{ userId: "u2", email: "a@b.com" }]
    );
    expect(list.role).toBe("owner");
    expect(list.ownerId).toBe("u1");
    expect(list.sharedMembers).toEqual([{ userId: "u2", email: "a@b.com" }]);
  });

  it("por defecto los miembros compartidos van vacíos", () => {
    const list = toList(row, [], "editor");
    expect(list.sharedMembers).toEqual([]);
    expect(list.role).toBe("editor");
  });

  it("mapea color y emoji válidos", () => {
    const list = toList(
      { ...row, color: "teal", emoji: "🛒" },
      [],
      "owner"
    );
    expect(list.color).toBe("teal");
    expect(list.emoji).toBe("🛒");
  });

  it("valores inválidos del server no rompen: caen a undefined", () => {
    const list = toList(
      { ...row, color: "rojo", emoji: "producto inválido" },
      [],
      "owner"
    );
    expect(list.color).toBeUndefined();
    expect(list.emoji).toBeUndefined();
  });

  it("sin color/emoji quedan undefined (el render usa el default)", () => {
    const list = toList(rowDefault, [], "owner");
    expect(list.color).toBeUndefined();
    expect(list.emoji).toBeUndefined();
  });
});
