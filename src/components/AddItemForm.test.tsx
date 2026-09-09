import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddItemForm from "@/components/AddItemForm";

const { addItem } = vi.hoisted(() => ({
  addItem: vi.fn(),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof storeState) => unknown) =>
    sel(storeState),
}));

const storeState = vi.hoisted(() => ({
  addItem,
}));

const { haptic } = vi.hoisted(() => ({
  haptic: vi.fn(),
}));

vi.mock("@/lib/haptics", () => ({ haptic }));

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

describe("AddItemForm", () => {
  const onClose = vi.fn<() => void>();
  const onExited = vi.fn<() => void>();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("en modo normal muestra nombre, descripción, cantidad y unidad", () => {
    render(<AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />);
    expect(screen.getByLabelText("Nombre del elemento")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Descripción (opcional)")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Cantidad")).toBeInTheDocument();
    expect(screen.getByLabelText("Unidad (opcional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Añadir" })).toBeInTheDocument();
  });

  it("en modo foco muestra solo nombre y botón Agregar", () => {
    render(<AddItemForm listId="l1" focusMode closing={false} onClose={onClose} onExited={onExited} />);
    expect(screen.getByLabelText("Nombre del elemento")).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Descripción (opcional)")
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Cantidad")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument();
  });

  it("enfoca el input de nombre al montar", () => {
    render(
      <AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />
    );
    expect(screen.getByLabelText("Nombre del elemento")).toHaveFocus();
  });

  it("inicia colapsado y se expande tras el primer frame", async () => {
    const { container } = render(
      <AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />
    );
    const wrapper = container.querySelector(".collapse-form");
    expect(wrapper).not.toBeNull();
    expect(wrapper!.classList.contains("collapse-form-open")).toBe(false);

    await waitFor(() => {
      expect(wrapper!.classList.contains("collapse-form-open")).toBe(true);
    });
  });

  it("en cierre colapsa y dispara onExited al terminar la transición", () => {
    const { container } = render(
      <AddItemForm listId="l1" focusMode={false} closing onClose={onClose} onExited={onExited} />
    );
    const wrapper = container.querySelector(".collapse-form") as HTMLElement;
    expect(wrapper.classList.contains("collapse-form-open")).toBe(false);
    expect(wrapper).toHaveAttribute("aria-hidden", "true");

    fireEvent.transitionEnd(wrapper);
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("no agrega nada con nombre vacío o solo espacios", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />);
    await user.click(screen.getByRole("button", { name: "Añadir" }));
    expect(addItem).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Nombre del elemento"), "   ");
    await user.click(screen.getByRole("button", { name: "Añadir" }));
    expect(addItem).not.toHaveBeenCalled();
  });

  it("agrega el elemento, resetea los campos y permanece abierto", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />);

    await user.type(screen.getByLabelText("Nombre del elemento"), "Leche");
    await user.type(
      screen.getByLabelText("Descripción (opcional)"),
      "Deslactosada"
    );
    await user.clear(screen.getByLabelText("Cantidad"));
    await user.type(screen.getByLabelText("Cantidad"), "3");
    await user.type(screen.getByLabelText("Unidad (opcional)"), "l");
    await user.click(screen.getByRole("button", { name: "Añadir" }));

    expect(addItem).toHaveBeenCalledWith("l1", {
      name: "Leche",
      description: "Deslactosada",
      quantity: 3,
      unit: "l",
    });
    expect(screen.getByLabelText("Nombre del elemento")).toHaveValue("");
    expect(screen.getByLabelText("Cantidad")).toHaveValue(1);
    expect(screen.getByRole("form")).toBeInTheDocument();
  });

  it("llama a haptic al agregar en modo foco", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode closing={false} onClose={onClose} onExited={onExited} />);
    await user.type(screen.getByLabelText("Nombre del elemento"), "Manzanas");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(addItem).toHaveBeenCalledWith("l1", {
      name: "Manzanas",
      description: "",
      quantity: 1,
      unit: "",
    });
    expect(haptic).toHaveBeenCalledTimes(1);
  });

  it("cierra con Escape", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("muestra el error de voz con role=alert", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode={false} closing={false} onClose={onClose} onExited={onExited} />);
    await user.click(screen.getByRole("button", { name: "mic" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo iniciar el dictado."
    );
  });

  it("en modo foco cantidad y unidad no se envían", async () => {
    const user = userEvent.setup();
    render(<AddItemForm listId="l1" focusMode closing={false} onClose={onClose} onExited={onExited} />);
    await user.type(screen.getByLabelText("Nombre del elemento"), "Pan");
    await user.click(screen.getByRole("button", { name: "Agregar" }));
    expect(addItem).toHaveBeenCalledWith("l1", {
      name: "Pan",
      description: "",
      quantity: 1,
      unit: "",
    });
  });
});