import { describe, it, expect } from "vitest";
import { detectSwipe } from "./gestures";

describe("detectSwipe", () => {
  it("reconoce un swipe a la derecha sobre el umbral", () => {
    expect(detectSwipe(80, 10)).toBe("right");
  });

  it("reconoce un swipe a la izquierda sobre el umbral", () => {
    expect(detectSwipe(-80, 10)).toBe("left");
  });

  it("devuelve null si no supera el umbral", () => {
    expect(detectSwipe(40, 5)).toBeNull();
    expect(detectSwipe(-40, 5)).toBeNull();
    expect(detectSwipe(64, 0)).toBe("right");
    expect(detectSwipe(63, 0)).toBeNull();
  });

  it("exige dominancia horizontal (no compita con el scroll vertical)", () => {
    expect(detectSwipe(80, 80)).toBeNull();
    expect(detectSwipe(80, 120)).toBeNull();
  });

  it("respeta un umbral parametrizado", () => {
    expect(detectSwipe(30, 5, 32)).toBeNull();
    expect(detectSwipe(40, 5, 32)).toBe("right");
  });

  it("sin desplazamiento devuelve null", () => {
    expect(detectSwipe(0, 0)).toBeNull();
  });
});