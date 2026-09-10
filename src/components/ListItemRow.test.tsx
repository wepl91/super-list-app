import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListItemRow from "@/components/ListItemRow";
import { useListStore } from "@/lib/stores/listStore";
import { usePantry } from "@/lib/stores/pantryStore";
import type { ListItem } from "@/lib/types";

vi.mock("@/components/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

function item(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: "item-1",
    name: "Leche",
    description: undefined,
    quantity: 5,
    unit: undefined,
    completed: false,
    position: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function renderRow(overrides: Partial<ListItem> = {}, props: Record<string, unknown> = {}) {
  return render(
    <ListItemRow
      listId="list-1"
      item={item(overrides)}
      editing={false}
      onEdit={() => {}}
      onCancelEdit={() => {}}
      onSave={() => {}}
      {...props}
    />
  );
}

describe("ListItemRow layout", () => {
  beforeEach(() => {
    useListStore.setState({
      items: {},
      toggleItem: vi.fn(),
      togglePin: vi.fn(),
      deleteItem: vi.fn(),
    } as never);
    usePantry.setState({ products: [] });
  });

  it("RF-1: muestra la cantidad entre paréntesis junto al nombre", () => {
    const { container } = renderRow();
    expect(container.textContent).toContain("Leche (5)");
  });

  it("RF-2: muestra unidad como 'Nombre (cantidad unidad)'", () => {
    const { container } = renderRow({ name: "Arroz", quantity: 2, unit: "kg" });
    expect(container.textContent).toContain("Arroz (2 kg)");
  });

  it("RF-3: renderiza la descripción debajo del nombre", () => {
    const desc = "Descripción larga".repeat(5);
    renderRow({ description: desc });
    expect(screen.getByText(desc)).toBeInTheDocument();
  });

  it("RF-4: sin descripción no renderiza bloque de descripción", () => {
    renderRow();
    expect(screen.queryByText(/^Descripción/)).not.toBeInTheDocument();
  });

  it("RF-5: mantiene el aria-label del checkbox con el nombre", () => {
    renderRow();
    expect(screen.getByRole("checkbox", { name: "Completar Leche" })).toBeInTheDocument();
  });

  it("RF-6: mantiene los botones de editar y eliminar", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Editar Leche" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar Leche" })).toBeInTheDocument();
  });

  it("oculta los botones de acción en modo solo lectura", () => {
    renderRow({}, { isReadOnly: true });
    expect(screen.queryByRole("button", { name: "Editar Leche" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Leche" })).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Completar Leche" })).toBeDisabled();
  });

  it("muestra el emoji del producto de la despensa cuando el nombre coincide", () => {
    usePantry.setState({
      products: [
        { id: "p1", name: "leche", emoji: "🥛", count: 1, lastUsedAt: 1 },
      ],
    });
    renderRow();
    expect(screen.getByText("🥛")).toBeInTheDocument();
  });

  it("no muestra emoji cuando no hay producto coincidente en la despensa", () => {
    usePantry.setState({
      products: [
        { id: "p1", name: "harina", emoji: "🌾", count: 1, lastUsedAt: 1 },
      ],
    });
    const { container } = renderRow();
    expect(container.textContent).not.toContain("🌾");
  });
});

describe("ListItemRow fijación", () => {
  const togglePin = () => useListStore.getState().togglePin as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useListStore.setState({
      items: {},
      toggleItem: vi.fn(),
      togglePin: vi.fn(),
      deleteItem: vi.fn(),
    } as never);
  });

  it("muestra el botón pin con aria-pressed false para un item sin fijar", () => {
    renderRow();
    const pin = screen.getByRole("button", { name: "Fijar Leche" });
    expect(pin).toHaveAttribute("aria-pressed", "false");
  });

  it("un item fijado muestra 'Desfijar' con aria-pressed true", () => {
    renderRow({ pinned: true });
    expect(screen.getByRole("button", { name: "Desfijar Leche" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("click en el pin llama a togglePin con list/item", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole("button", { name: "Fijar Leche" }));
    expect(togglePin()).toHaveBeenCalledWith("list-1", "item-1");
  });

  it("en read-only no hay pin (no muta listas ajenas)", () => {
    renderRow({}, { isReadOnly: true });
    expect(screen.queryByRole("button", { name: /Fijar|Desfijar/ })).not.toBeInTheDocument();
  });
});

describe("ListItemRow swipe", () => {
  const toggleItem = () => useListStore.getState().toggleItem as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useListStore.setState({
      items: {},
      toggleItem: vi.fn(),
      togglePin: vi.fn(),
      deleteItem: vi.fn(),
    } as never);
  });

  function swipe(toX: number, opts: { fromX?: number; fromY?: number; toY?: number } = {}) {
    const li = screen.getByRole("listitem");
    fireEvent.pointerDown(li, {
      pointerId: 11,
      clientX: opts.fromX ?? 0,
      clientY: opts.fromY ?? 10,
    });
    fireEvent.pointerMove(window, { pointerId: 11, clientX: toX, clientY: opts.toY ?? 10 });
    fireEvent.pointerUp(window, { pointerId: 11, clientX: toX, clientY: opts.toY ?? 10 });
  }

  it("swipe a la derecha completa un item pendiente", () => {
    renderRow();
    act(() => swipe(90));
    expect(toggleItem()).toHaveBeenCalledWith("list-1", "item-1");
  });

  it("swipe a la izquierda desmarca un item completado", () => {
    renderRow({ completed: true });
    act(() => swipe(10, { fromX: 120 }));
    expect(toggleItem()).toHaveBeenCalledWith("list-1", "item-1");
  });

  it("swipe a la izquierda no toca un item pendiente", () => {
    renderRow();
    act(() => swipe(10, { fromX: 120 }));
    expect(toggleItem()).not.toHaveBeenCalled();
  });

  it("swipe corto (bajo umbral) no completa", () => {
    renderRow();
    act(() => swipe(30));
    expect(toggleItem()).not.toHaveBeenCalled();
  });

  it("en read-only el swipe no muta nada", () => {
    renderRow({}, { isReadOnly: true });
    act(() => swipe(90));
    expect(toggleItem()).not.toHaveBeenCalled();
  });

  it("un swipe que empieza en un botón (el pin) no dispara toggle", () => {
    renderRow();
    const pin = screen.getByRole("button", { name: "Fijar Leche" }) as HTMLElement;
    act(() => {
      fireEvent.pointerDown(pin, { pointerId: 12, clientX: 0, clientY: 10 });
      fireEvent.pointerMove(window, { pointerId: 12, clientX: 90, clientY: 10 });
      fireEvent.pointerUp(window, { pointerId: 12, clientX: 90, clientY: 10 });
    });
    expect(toggleItem()).not.toHaveBeenCalled();
  });

  it("muestra el feedback en vivo del desplazamiento horizontal", () => {
    const { container } = renderRow();
    const li = container.querySelector("li") as HTMLElement;
    act(() => {
      fireEvent.pointerDown(li, { pointerId: 13, clientX: 0, clientY: 10 });
      fireEvent.pointerMove(window, { pointerId: 13, clientX: 70, clientY: 12 });
    });
    expect(li.style.transform).toBe("translate3d(70px, 0, 0)");
    act(() => {
      fireEvent.pointerUp(window, { pointerId: 13, clientX: 70, clientY: 12 });
    });
    expect(li.style.transform).toBe("");
  });
});
