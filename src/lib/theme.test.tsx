import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "@/lib/theme";

function Probe() {
  const { theme, toggle } = useTheme();
  return (
    <button type="button" onClick={toggle} aria-label={`current:${theme}`}>
      {theme}
    </button>
  );
}

describe("theme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("arranca en light por defecto sin preferencia guardada", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const { findByRole } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    const btn = await findByRole("button", { name: "current:light" });
    expect(btn).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("respeta la preferencia del sistema (dark)", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const { findByRole } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    await findByRole("button", { name: "current:dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("lee la preferencia guardada en localStorage (dark)", async () => {
    localStorage.setItem("super-list-theme", "dark");
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const { findByRole } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    await findByRole("button", { name: "current:dark" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggle alterna y persiste (light -> dark)", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as typeof window.matchMedia;

    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    const btn = await screen.findByRole("button", { name: "current:light" });
    await user.click(btn);
    expect(localStorage.getItem("super-list-theme")).toBe("dark");
    const dark = await screen.findByRole("button", { name: "current:dark" });
    expect(dark).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(dark);
    expect(localStorage.getItem("super-list-theme")).toBe("light");
    await screen.findByRole("button", { name: "current:light" });
  });
});

describe("useTheme fuera de ThemeProvider", () => {
  it("lanza un error si no hay provider", () => {
    function Bad() {
      useTheme();
      return null;
    }
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bad />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
    spy.mockRestore();
  });
});