import { describe, it, expect } from "vitest";
import { normalizeProductName } from "./productNames";

describe("normalizeProductName", () => {
  it("trim + lowercase", () => {
    expect(normalizeProductName("  Leche ")).toBe("leche");
  });

  it("colapsa espacios internos múltiples", () => {
    expect(normalizeProductName("arroz  integral")).toBe("arroz integral");
  });

  it("deduplica variantes de capitalización", () => {
    expect(normalizeProductName("LECHE")).toBe("leche");
    expect(normalizeProductName(" Leche ")).toBe("leche");
  });

  it("solo espacios devuelve vacío", () => {
    expect(normalizeProductName("   ")).toBe("");
  });
});