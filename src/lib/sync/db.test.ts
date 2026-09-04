import { describe, it, expect } from "vitest";
import { toList, type ListRow } from "./db";

const row: ListRow = {
  id: "l1",
  owner_id: "u1",
  name: "Supermercado",
  position: 0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-02T00:00:00Z",
};

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
});
