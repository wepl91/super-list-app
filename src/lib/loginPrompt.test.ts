import { describe, it, expect, vi, afterEach } from "vitest";
import { OPEN_LOGIN_EVENT, openLoginModal } from "@/lib/loginPrompt";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openLoginModal", () => {
  it("dispara el evento custom OPEN_LOGIN_EVENT", () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    openLoginModal();
    const event = dispatch.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe(OPEN_LOGIN_EVENT);
    expect(event).toBeInstanceOf(CustomEvent);
  });

  it("devuelve undefined en un entorno sin window", () => {
    // Simular server-side: window indefinido
    const origWindow = globalThis.window;
    // @ts-expect-error: simular ausencia de window
    delete globalThis.window;
    expect(openLoginModal()).toBeUndefined();
    globalThis.window = origWindow;
  });
});