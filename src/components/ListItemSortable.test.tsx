import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ListItemSortable from "./ListItemSortable";
import type { ListItem } from "@/lib/types";

const sortable = vi.hoisted(() => ({ useSortable: vi.fn() }));
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: (...args: unknown[]) => sortable.useSortable(...args),
}));

const store = vi.hoisted(() => ({
  toggleItem: vi.fn(),
  togglePin: vi.fn(),
  deleteItem: vi.fn(),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof store) => unknown) => sel(store),
}));

vi.mock("@/components/ConfirmDialog", () => ({ default: () => null }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

const item: ListItem = {
  id: "item-1",
  name: "Leche",
  quantity: 2,
  completed: false,
  position: 0,
  createdAt: 0,
  updatedAt: 0,
};

function mockSortable(overrides: Record<string, unknown> = {}) {
  sortable.useSortable.mockReturnValue({
    attributes: { "aria-roledescription": "elemento" },
    listeners: { onPointerDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
    ...overrides,
  });
}

function renderRow(overrides: Record<string, unknown> = {}) {
  return render(
    <ListItemSortable
      listId="list-1"
      item={item}
      editing={false}
      onEdit={() => {}}
      onCancelEdit={() => {}}
      onSave={() => {}}
      {...overrides}
    />
  );
}

describe("ListItemSortable", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expone un handle de arrastre con data-drag-handle y atributos de dnd-kit", () => {
    mockSortable();
    renderRow();
    const grip = screen.getByRole("button", { name: "Reordenar Leche" });
    expect(grip).toHaveAttribute("data-drag-handle");
    expect(grip).toHaveAttribute("aria-roledescription", "elemento");
  });

  it("conecta el setNodeRef al li de la fila", () => {
    const setNodeRef = vi.fn();
    mockSortable({ setNodeRef });
    const { container } = renderRow();
    const li = container.querySelector("li");
    expect(li).not.toBeNull();
    expect(setNodeRef).toHaveBeenCalledWith(li);
  });

  it("en read-only no ofrece handle de arrastre", () => {
    mockSortable();
    renderRow({ isReadOnly: true });
    expect(screen.queryByRole("button", { name: "Reordenar Leche" })).not.toBeInTheDocument();
  });

  it("mientras arrastra aplica el transform de dnd-kit y marca el estado visual", () => {
    mockSortable({ transform: { x: 10, y: 20, scaleX: 1, scaleY: 1 }, isDragging: true });
    const { container } = renderRow();
    const li = container.querySelector("li") as HTMLElement;
    expect(li.style.transform).toBe("translate3d(10px, 20px, 0)");
    expect(li.className).toMatch(/ring-primary/);
  });

  it("delega la edición a la fila (sin romper)", () => {
    mockSortable();
    renderRow();
    expect(screen.getByRole("checkbox", { name: "Completar Leche" })).toBeInTheDocument();
  });
});