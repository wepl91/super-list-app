import { describe, it, expect, vi, afterEach } from "vitest";
import { haptic } from "@/lib/haptics";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("haptic", () => {
  it("vibra con el patrón por defecto", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    haptic();
    expect(vibrate).toHaveBeenCalledWith(10);
  });

  it("vibra con un patrón custom", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    haptic([20, 40, 20]);
    expect(vibrate).toHaveBeenCalledWith([20, 40, 20]);
  });

  it("hace no-op si navigator.vibrate no existe", () => {
    Object.defineProperty(navigator, "vibrate", {
      value: undefined,
      configurable: true,
    });
    expect(() => haptic()).not.toThrow();
  });

  it("hace no-op si navigator.vibrate lanza", () => {
    const vibrate = vi.fn(() => {
      throw new Error("denied");
    });
    Object.defineProperty(navigator, "vibrate", {
      value: vibrate,
      configurable: true,
    });
    expect(() => haptic()).not.toThrow();
  });
});