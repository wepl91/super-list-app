"use client";

const OPENFOODFACTS_URL = (code: string) =>
  `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    code
  )}.json`;

type ProductResponse = {
  status?: number;
  product?: {
    product_name?: string | null;
    product_name_es?: string | null;
    generic_name?: string | null;
    generic_name_es?: string | null;
  } | null;
};

/** Busca el nombre comercial de un código de barras en Open Food Facts (API
 *  libre, sin key). Devuelve `null` ante cualquier fallo (sin red, no
 *  encontrado, error HTTP) para que el flujo siga siendo offline-first.
 *  Solo se consulta cuando el código es desconocido localmente. */
export async function lookupProductName(
  code: string,
  fetcher: typeof fetch = fetch,
  timeoutMs = 5000
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetcher(OPENFOODFACTS_URL(code), { signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const data = (await res.json()) as ProductResponse;
    if (data.status !== 1 || !data.product) return null;
    const p = data.product;
    return (
      p.product_name?.trim() ||
      p.product_name_es?.trim() ||
      p.generic_name?.trim() ||
      p.generic_name_es?.trim() ||
      null
    );
  } catch {
    return null;
  }
}