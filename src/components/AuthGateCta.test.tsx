import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthGateCta from "@/components/AuthGateCta";

describe("AuthGateCta", () => {
  it("muestra el aviso y el botón de inicio de sesión", () => {
    render(<AuthGateCta />);
    expect(
      screen.getByText("Ingresá para poder crear y editar tus listas.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" })
    ).toBeInTheDocument();
  });

  it("dispara openLoginModal al hacer click", async () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const user = userEvent.setup();
    render(<AuthGateCta />);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    expect(dispatch).toHaveBeenCalled();
    expect((dispatch.mock.calls[0][0] as CustomEvent).type).toBe(
      "super-list:open-login"
    );
  });

  it("no rompe en modo compact", () => {
    const { container } = render(<AuthGateCta compact />);
    expect(
      screen.getByRole("button", { name: "Iniciar sesión" })
    ).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });
});