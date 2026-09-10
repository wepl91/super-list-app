import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BarcodeScannerButton from "./BarcodeScannerButton";

const frames: Array<(t: number) => void> = [];

class FakeDetector {
  static getSupportedFormats() {
    return Promise.resolve(["ean_13", "code_128"]);
  }
  detect = vi.fn().mockResolvedValue([{ rawValue: "7790070239437" }]);
}

let fakeStream: { getTracks: () => { stop: ReturnType<typeof vi.fn> }[] };
let fakeGetUserMedia: ReturnType<typeof vi.fn>;

function stubMedia(options?: { allowed?: boolean }) {
  const stop = vi.fn();
  fakeStream = { getTracks: () => [{ stop }] };
  const allowed = options?.allowed ?? true;
  fakeGetUserMedia = vi.fn().mockImplementation(() =>
    allowed
      ? Promise.resolve(fakeStream)
      : Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }))
  );
  Object.defineProperty(window.navigator, "mediaDevices", {
    value: { getUserMedia: fakeGetUserMedia },
    configurable: true,
  });
}

beforeEach(() => {
  frames.length = 0;
  vi.stubGlobal("BarcodeDetector", FakeDetector);
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  stubMedia();
});

describe("BarcodeScannerButton", () => {
  it("no renderiza nada si BarcodeDetector no está soportado", () => {
    vi.stubGlobal("BarcodeDetector", undefined);
    const { container } = render(<BarcodeScannerButton onDetect={vi.fn()} />);
    expect(container.querySelector("button")).toBeNull();
  });

  it("abre el overlay con la cámara al tocar el botón y pasa a escaneando", async () => {
    render(<BarcodeScannerButton onDetect={vi.fn()} />);

    const toggle = screen.getByRole("button", {
      name: "Escanear código de barras",
    });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-pressed", "true");
    const dialog = screen.getByRole("dialog", {
      name: "Escáner de códigos de barras",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() =>
      expect(
        screen.getByText("Apuntá a un código de barras")
      ).toBeInTheDocument()
    );
    expect(screen.getByTestId("scanner-video")).toBeInTheDocument();
  });

  it("Escape cierra el overlay y devuelve el foco al botón", async () => {
    render(<BarcodeScannerButton onDetect={vi.fn()} />);

    const toggle = screen.getByRole("button", {
      name: "Escanear código de barras",
    });
    await userEvent.click(toggle);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
  });

  it("el botón Cerrar cierra el overlay y detiene la cámara", async () => {
    render(<BarcodeScannerButton onDetect={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Escanear código de barras" })
    );
    await waitFor(() =>
      expect(
        screen.getByText("Apuntá a un código de barras")
      ).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /Cerrar/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fakeStream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it("muestra el aviso de permiso si la cámara se deniega y no rompe", async () => {
    stubMedia({ allowed: false });
    render(<BarcodeScannerButton onDetect={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Escanear código de barras" })
    );

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Necesito permiso para usar la cámara."
      )
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("al detectar un código invoca onDetect y cierra el overlay", async () => {
    const onDetect = vi.fn();
    render(<BarcodeScannerButton onDetect={onDetect} />);

    await userEvent.click(
      screen.getByRole("button", { name: "Escanear código de barras" })
    );
    await waitFor(() =>
      expect(
        screen.getByText("Apuntá a un código de barras")
      ).toBeInTheDocument()
    );

    const video = screen.getByTestId("scanner-video");
    Object.defineProperty(video, "readyState", { value: 4, configurable: true });

    await act(async () => {
      const frame = frames.shift();
      frame?.(0);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(onDetect).toHaveBeenCalledWith("7790070239437")
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});