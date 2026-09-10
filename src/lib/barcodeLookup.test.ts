import { describe, it, expect, vi } from "vitest";
import { lookupProductName } from "./barcodeLookup";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("lookupProductName", () => {
  it("devuelve el nombre del producto cuando el status es 1", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        status: 1,
        product: { product_name: "Leche entera" },
      })
    );
    await expect(lookupProductName("7790070239437", fetcher)).resolves.toBe(
      "Leche entera"
    );
  });

  it("consulta la URL de Open Food Facts con el código", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, { status: 1, product: { product_name: "Pan" } })
    );
    await lookupProductName("7790070239437", fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      "https://world.openfoodfacts.org/api/v2/product/7790070239437.json",
      { signal: expect.anything() }
    );
  });

  it("hace fallback al nombre en español", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        status: 1,
        product: { product_name: null, product_name_es: "Galletitas" },
      })
    );
    await expect(lookupProductName("1", fetcher)).resolves.toBe(
      "Galletitas"
    );
  });

  it("devuelve null si el producto no está en la base (status 0)", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 0, product: null }));
    await expect(lookupProductName("123", fetcher)).resolves.toBeNull();
  });

  it("devuelve null ante un error HTTP", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    await expect(lookupProductName("123", fetcher)).resolves.toBeNull();
  });

  it("devuelve null si el fetch falla (sin red)", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Network down"));
    await expect(lookupProductName("123", fetcher)).resolves.toBeNull();
  });

  it("devuelve null si la respuesta no tiene campos de nombre", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: 1, product: {} }));
    await expect(lookupProductName("123", fetcher)).resolves.toBeNull();
  });
});