import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateListDialog from "@/components/CreateListDialog";

const { createList } = vi.hoisted(() => ({
  createList: vi.fn(),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof storeState) => unknown) =>
    sel(storeState),
}));

const storeState = vi.hoisted(() => ({
  createList,
}));

vi.mock("@/components/VoiceDictationButton", () => ({
  default: ({ onError }: { onError?: (msg: string) => void }) => (
    <button
      type="button"
      onClick={() => onError?.("No se pudo iniciar el dictado.")}
    >
      mic
    </button>
  ),
}));

describe("CreateListDialog", () => {
  const onClose = vi.fn<() => void>();
  const onCreated = vi.fn<(id: string) => void>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no renderiza nada si está cerrado", () => {
    const { container } = render(
      <CreateListDialog open={false} onClose={onClose} onCreated={onCreated} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el diálogo y enfoca el input al abrir", () => {
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);
    expect(
      screen.getByRole("dialog", { name: "Nueva lista" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de la lista")).toHaveFocus();
  });

  it("crea la lista al escribir un nombre y confirmar", async () => {
    createList.mockReturnValue("l1");
    const user = userEvent.setup();
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Nombre de la lista"), "  Mi lista  ");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(createList).toHaveBeenCalledWith("Mi lista");
    expect(onCreated).toHaveBeenCalledWith("l1");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("no crea nada si createList no devuelve id", async () => {
    createList.mockReturnValue("");
    const user = userEvent.setup();
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);

    await user.type(screen.getByLabelText("Nombre de la lista"), "Mi lista");
    await user.click(screen.getByRole("button", { name: "Crear" }));

    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("tiene el botón Crear deshabilitado con nombre vacío", async () => {
    const user = userEvent.setup();
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);

    const create = screen.getByRole("button", { name: "Crear" });
    expect(create).toBeDisabled();

    await user.type(screen.getByLabelText("Nombre de la lista"), "  ");
    expect(create).toBeDisabled();

    await user.type(screen.getByLabelText("Nombre de la lista"), "Feria");
    expect(create).toBeEnabled();
  });

  it("cierra con Escape", async () => {
    const user = userEvent.setup();
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("cierra al hacer click en el backdrop", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CreateListDialog open onClose={onClose} onCreated={onCreated} />
    );
    const backdrop = container.querySelector(".absolute.inset-0");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("resetea el nombre al cerrar y reabrir", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CreateListDialog open onClose={onClose} onCreated={onCreated} />
    );
    await user.type(screen.getByLabelText("Nombre de la lista"), "Mi lista");

    rerender(<CreateListDialog open={false} onClose={onClose} onCreated={onCreated} />);
    rerender(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);

    expect(screen.getByLabelText("Nombre de la lista")).toHaveValue("");
  });

  it("muestra error de voz con role=alert", async () => {
    const user = userEvent.setup();
    render(<CreateListDialog open onClose={onClose} onCreated={onCreated} />);

    await user.click(screen.getByRole("button", { name: "mic" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo iniciar el dictado."
    );
  });
});