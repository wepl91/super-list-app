import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InstallPrompt from "@/components/InstallPrompt";

function matchMediaMock(matches: boolean) {
  return vi.fn().mockReturnValue({
    matches,
    media: "",
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
}

describe("InstallPrompt", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "userAgent", {
      value: "test-agent",
      configurable: true,
    });
    if (navigator.clipboard) {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        configurable: true,
      });
    }
  });

  it("es null en modo standalone", () => {
    window.matchMedia = matchMediaMock(true);
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it("muestra la pantalla iOS con pasos y botón copiar link", async () => {
    window.matchMedia = matchMediaMock(false);
    Object.defineProperty(navigator, "userAgent", {
      value: "iPhone",
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const { findByText } = render(<InstallPrompt />);
    expect(await findByText("Instalá Super List")).toBeInTheDocument();
    expect(
      screen.getByText(/Añadir a pantalla de inicio/i)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(await findByText("¡Copiado!")).toBeInTheDocument();
  });

  it("muestra botón 'Instalar app' cuando hay beforeinstallprompt", async () => {
    window.matchMedia = matchMediaMock(false);
    const { findByRole } = render(<InstallPrompt />);
    const evt = new Event("beforeinstallprompt", { cancelable: true });
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const userChoice = vi.fn().mockResolvedValue({ outcome: "accepted" });
    Object.assign(evt, {
      prompt: promptFn,
      userChoice: userChoice(),
    });
    fireEvent(window, evt);
    const installBtn = await findByRole("button", { name: "Instalar app" });
    expect(installBtn).toBeInTheDocument();
    await userEvent.setup().click(installBtn);
    await waitFor(() => expect(promptFn).toHaveBeenCalled());
  });

  it("muestra el fallback general", async () => {
    window.matchMedia = matchMediaMock(false);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    const { findByText } = render(<InstallPrompt />);
    expect(await findByText("Instalá Super List")).toBeInTheDocument();
    expect(screen.getByText(/Chrome o Edge/i)).toBeInTheDocument();
  });
});