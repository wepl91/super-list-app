import { describe, it, expect } from "vitest";
import { normalizeBarcode, isRawBarcode } from "./barcodes";

describe("normalizeBarcode", () => {
  it("recorta espacios al inicio y final", () => {
    expect(normalizeBarcode("  7790070239437  ")).toBe("7790070239437");
  });

  it("colapsa espacios internos duplicados", () => {
    expect(normalizeBarcode("7790  0702 39437")).toBe("7790 0702 39437");
  });

  it("devuelve la cadena normalizada tal cual si viene limpia", () => {
    expect(normalizeBarcode("7790070239437")).toBe("7790070239437");
  });
});

describe("isRawBarcode", () => {
  it("true si el nombre es el código (con o sin espacios)", () => {
    expect(isRawBarcode("7790070239437", "7790070239437")).toBe(true);
    expect(isRawBarcode("  7790070239437 ", "7790070239437")).toBe(true);
  });

  it("false si el usuario renombró el elemento", () => {
    expect(isRawBarcode("Leche", "7790070239437")).toBe(false);
  });

  it("false contra un nombre vacío", () => {
    expect(isRawBarcode("", "7790070239437")).toBe(false);
  });
});