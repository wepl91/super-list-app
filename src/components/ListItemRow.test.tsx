import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ListItemRow from "@/components/ListItemRow";
import { useListStore } from "@/lib/stores/listStore";
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
      deleteItem: vi.fn(),
    } as never);
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
});
