import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHydrated } from "@/lib/useHydrated";

describe("useHydrated", () => {
  it("devuelve true en el cliente (hydratado)", () => {
    const { result } = renderHook(() => useHydrated());
    expect(result.current).toBe(true);
  });
});