"use client";

/** Formato de código de barras reportado por `BarcodeDetector.getSupportedFormats()`.
 *  Como depende del hardware/navegador, lo tipamos como string y no se filtra. */
export type BarcodeFormat = string;

/** Normaliza el valor crudo de un código de barras detectado:
 *  recorta espacios y colapsa duplicados/espacios atípicos. */
export function normalizeBarcode(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** ¿El nombre del campo sigue siendo el código cruto (sin renombrar)?
 *  Útil al agregar: si el usuario dejó el código tal cual, no tiene sentido
 *  persistir el mapeo código → (mismo) código. */
export function isRawBarcode(name: string, code: string): boolean {
  return name.trim() === normalizeBarcode(code);
}