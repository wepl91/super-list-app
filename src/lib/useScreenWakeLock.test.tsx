import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useScreenWakeLock } from "@/lib/useScreenWakeLock";

function Probe() {
  useScreenWakeLock();
  return <div />;
}

type WakeLockLike = {
  request: ReturnType<typeof vi.fn>;
};

describe("useScreenWakeLock", () => {
  let wakeLock: WakeLockLike;
  let releaseFn: ReturnType<typeof vi.fn>;
  let listeners: Record<string, () => void>;

  beforeEach(() => {
    releaseFn = vi.fn().mockResolvedValue(undefined);
    listeners = {};
    const sentinel = {
      release: releaseFn,
      addEventListener: vi.fn((type: string, cb: () => void) => {
        listeners[type] = cb;
      }),
    };
    wakeLock = { request: vi.fn().mockResolvedValue(sentinel) };
    Object.defineProperty(navigator, "wakeLock", {
      value: wakeLock,
      configurable: true,
    });

    let visibilityHandler: (() => void) | null = null;
    vi.spyOn(document, "addEventListener").mockImplementation(
      ((type: string, cb: EventListenerOrEventListenerObject) => {
        if (type === "visibilitychange" && typeof cb === "function") {
          visibilityHandler = cb as () => void;
        }
      }) as typeof document.addEventListener
    );
    // @ts-expect-error: exponer handler para el test
    document.__visibilityHandler = () => visibilityHandler?.();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error: limpiar
    delete document.__visibilityHandler;
  });

  it("pide el wake lock screen al montar", () => {
    const { unmount } = render(<Probe />);
    expect(wakeLock.request).toHaveBeenCalledWith("screen");
    unmount();
  });

  it("libera el lock al desmontar", async () => {
    const { unmount } = render(<Probe />);
    // dejar que la promesa de request resuelva y asigne el sentinel
    await Promise.resolve();
    await Promise.resolve();
    unmount();
    expect(releaseFn).toHaveBeenCalled();
  });

  it("no-op sin soporte (navigator.wakeLock ausente)", () => {
    Object.defineProperty(navigator, "wakeLock", {
      value: undefined,
      configurable: true,
    });
    expect(() => render(<Probe />)).not.toThrow();
  });

  it("no-op si request falla", () => {
    wakeLock.request = vi.fn().mockRejectedValue(new Error("denied"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).not.toThrow();
    spy.mockRestore();
  });
});