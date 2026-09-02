import { describe, it, expect, beforeEach } from "vitest";
import { usePreferences } from "@/lib/stores/preferencesStore";

describe("usePreferences (zustand persist)", () => {
  beforeEach(() => {
    localStorage.clear();
    usePreferences.setState({ focusMode: false, hideCompleted: false });
  });

  it("valores por defecto", () => {
    expect(usePreferences.getState().focusMode).toBe(false);
    expect(usePreferences.getState().hideCompleted).toBe(false);
  });

  it("setFocusMode cambia el valor", () => {
    usePreferences.getState().setFocusMode(true);
    expect(usePreferences.getState().focusMode).toBe(true);
  });

  it("setHideCompleted cambia el valor", () => {
    usePreferences.getState().setHideCompleted(true);
    expect(usePreferences.getState().hideCompleted).toBe(true);
  });

  it("persiste en localStorage", () => {
    usePreferences.getState().setFocusMode(true);
    const raw = localStorage.getItem("super-list-preferences");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.focusMode).toBe(true);
  });
});