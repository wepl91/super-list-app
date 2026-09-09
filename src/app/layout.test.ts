import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Nunito_Sans: () => ({ variable: "--font-nunito-sans", className: "x" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono", className: "x" }),
}));

import { viewport } from "./layout";

describe("RootLayout viewport", () => {
  it("usa interactive-widget=overlays-content para no redimensionar con el teclado móvil", () => {
    expect(viewport.interactiveWidget).toBe("overlays-content");
  });
});