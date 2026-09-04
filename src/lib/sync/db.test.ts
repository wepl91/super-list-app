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
  it("propaga sharedCount y role", () => {
    const list = toList(row, [], "owner", [], 3);
    expect(list.sharedCount).toBe(3);
    expect(list.role).toBe("owner");
    expect(list.sharedMembers).toEqual([]);
  });

  it("por defecto compartida no tiene miembros (sharedCount 0)", () => {
    const list = toList(row, [], "editor");
    expect(list.sharedCount).toBe(0);
    expect(list.sharedMembers).toEqual([]);
  });
});
