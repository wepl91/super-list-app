import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useBarcodeScanner } from "./useBarcodeScanner";

const frames: Array<(t: number) => void> = [];

class FakeDetector {
  static getSupportedFormats() {
    return Promise.resolve(["ean_13"]);
  }
  detect = vi.fn().mockResolvedValue([{ rawValue: "7790070239437" }]);
}

let fakeStop: ReturnType<typeof vi.fn>;
let fakeStream: { getTracks: () => { stop: typeof fakeStop }[] };

function Harness({ onDetect }: { onDetect: (code: string) => void }) {
  const { supported, status, error, open, close, videoRef } =
    useBarcodeScanner({ onDetect });
  return (
    <div>
      {supported && <video data-testid="video" ref={videoRef} />}
      <button onClick={() => void open()}>open</button>
      <button onClick={close}>close</button>
      <span data-testid="status">{supported ? status : "unsupported"}</span>
      {error && <span data-testid="error">{error}</span>}
    </div>
  );
}

function stubMediaApis(options?: {
  mediaAllowed?: boolean;
}) {
  fakeStop = vi.fn();
  fakeStream = { getTracks: () => [{ stop: fakeStop }] };
  const { mediaAllowed = true } = options ?? {};
  const getUserMedia = vi.fn().mockImplementation(
    () =>
      mediaAllowed
        ? Promise.resolve(fakeStream)
        : Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }))
  );
  Object.defineProperty(window.navigator, "mediaDevices", {
    value: { getUserMedia },
    configurable: true,
  });
  return { getUserMedia };
}

beforeEach(() => {
  frames.length = 0;
  vi.stubGlobal("BarcodeDetector", FakeDetector);
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    frames.push(cb);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  Object.defineProperty(window.navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [] }) },
    configurable: true,
  });
});

describe("useBarcodeScanner", () => {
  it("informa supported=false y no rompe si BarcodeDetector no existe", () => {
    vi.stubGlobal("BarcodeDetector", undefined);
    render(<Harness onDetect={vi.fn()} />);
    expect(screen.getByTestId("status")).toHaveTextContent("unsupported");
  });

  it("informa supported=false si la feature detection lanza", () => {
    class ThrowingDetector {
      static getSupportedFormats() {
        throw new Error("no soportado");
      }
      detect = vi.fn();
    }
    vi.stubGlobal("BarcodeDetector", ThrowingDetector);
    render(<Harness onDetect={vi.fn()} />);
    expect(screen.getByTestId("status")).toHaveTextContent("unsupported");
  });

  it("al abrir con cámara disponible pasa a scanning y detecta un código", async () => {
    stubMediaApis();
    const onDetect = vi.fn();
    render(<Harness onDetect={onDetect} />);

    await userEvent.click(screen.getByRole("button", { name: "open" }));

    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("scanning")
    );

    const video = screen.getByTestId("video");
    Object.defineProperty(video, "readyState", { value: 4, configurable: true });

    await act(async () => {
      const frame = frames.shift();
      frame?.(0);
      await Promise.resolve();
    });

    await waitFor(() => expect(onDetect).toHaveBeenCalledWith("7790070239437"));
  });

  it("muestra error de permiso si getUserMedia deniega", async () => {
    stubMediaApis({ mediaAllowed: false });
    render(<Harness onDetect={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "open" }));

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Necesito permiso para usar la cámara."
      )
    );
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("detiene el stream al cerrar", async () => {
    stubMediaApis();
    render(<Harness onDetect={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "open" }));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("scanning")
    );

    await userEvent.click(screen.getByRole("button", { name: "close" }));

    expect(fakeStop).toHaveBeenCalled();
    expect(screen.getByTestId("status")).toHaveTextContent("idle");
  });

  it("detiene el stream al desmontar", async () => {
    stubMediaApis();
    const { unmount } = render(<Harness onDetect={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "open" }));
    await waitFor(() =>
      expect(screen.getByTestId("status")).toHaveTextContent("scanning")
    );

    unmount();
    expect(fakeStop).toHaveBeenCalled();
  });
});