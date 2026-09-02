import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import ScreenKeepAwake from "@/components/ScreenKeepAwake";

describe("ScreenKeepAwake", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza sin contenido (no rompe sin wakeLock)", () => {
    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      configurable: true,
    });
    const { container } = render(<ScreenKeepAwake />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no rompe con wakeLock disponible", () => {
    const sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
    };
    Object.defineProperty(navigator, "wakeLock", {
      value: { request: vi.fn().mockResolvedValue(sentinel) },
      configurable: true,
    });
    const { container, unmount } = render(<ScreenKeepAwake />);
    unmount();
    expect(container).toBeEmptyDOMElement();
  });
});