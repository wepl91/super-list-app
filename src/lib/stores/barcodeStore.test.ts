import { describe, it, expect, beforeEach } from "vitest";
import { useBarcodes } from "./barcodeStore";

describe("barcodeStore", () => {
  beforeEach(() => {
    useBarcodes.setState({ codes: {} });
    localStorage.clear();
  });

  it("getBarcodeName devuelve undefined para un código desconocido", () => {
    expect(useBarcodes.getState().getBarcodeName("7790070239437")).toBeUndefined();
  });

  it("setBarcodeName persiste el mapeo y getBarcodeName lo recupera", () => {
    useBarcodes.getState().setBarcodeName("7790070239437", "Leche");
    expect(useBarcodes.getState().getBarcodeName("7790070239437")).toBe("Leche");
  });

  it("re-set de un código existente actualiza el nombre sin duplicarlo", () => {
    useBarcodes.getState().setBarcodeName("7790070239437", "Leche");
    useBarcodes.getState().setBarcodeName("7790070239437", "Leche entera");
    const { codes } = useBarcodes.getState();
    expect(Object.keys(codes)).toHaveLength(1);
    expect(codes["7790070239437"]).toBe("Leche entera");
  });

  it("evicta el más antiguo al superar el tope (FIFO)", () => {
    const store = useBarcodes.getState();
    // Cargamos 2001 códigos: el primero debe salir, el último quedar.
    for (let i = 0; i < 2001; i++) {
      store.setBarcodeName(`code-${i}`, `Nombre ${i}`);
    }
    const { codes } = useBarcodes.getState();
    expect(Object.keys(codes)).toHaveLength(2000);
    expect(codes["code-0"]).toBeUndefined();
    expect(codes["code-2000"]).toBe("Nombre 2000");
  });
});