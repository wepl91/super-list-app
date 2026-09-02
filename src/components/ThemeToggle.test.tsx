import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/lib/theme";
import ThemeToggle from "@/components/ThemeToggle";

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  it("en tema light muestra el botón para pasar a oscuro", async () => {
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
    localStorage.removeItem("super-list-theme");

    const { findByRole } = renderToggle();
    const btn = await findByRole("button", { name: "Cambiar a tema oscuro" });
    expect(btn).toHaveAttribute("title", "Tema oscuro");
  });

  it("en tema dark muestra el botón para pasar a claro", async () => {
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
    localStorage.setItem("super-list-theme", "dark");

    const { findByRole } = renderToggle();
    const btn = await findByRole("button", { name: "Cambiar a tema claro" });
    expect(btn).toHaveAttribute("title", "Tema claro");
  });

  it("cambia de tema al hacer click", async () => {
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
    localStorage.removeItem("super-list-theme");

    const user = userEvent.setup();
    const { findByRole } = renderToggle();
    const light = await findByRole("button", { name: "Cambiar a tema oscuro" });
    await user.click(light);
    expect(localStorage.getItem("super-list-theme")).toBe("dark");
    await findByRole("button", { name: "Cambiar a tema claro" });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});