import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PantryChips from "./PantryChips";
import { usePantry } from "@/lib/stores/pantryStore";

describe("PantryChips", () => {
  beforeEach(() => {
    localStorage.clear();
    usePantry.setState({ products: [] });
  });

  function seed(products: { name: string; emoji?: string; count: number }[]) {
    const { upsertProduct } = usePantry.getState();
    for (const p of products) {
      upsertProduct({ name: p.name, emoji: p.emoji });
      // acumular count
      for (let i = 1; i < p.count; i++) {
        usePantry.getState().recordItem(p.name);
      }
    }
  }

  it("sin coincidencias no renderiza nada", () => {
    render(<PantryChips name="" onPick={() => {}} />);
    expect(screen.queryByLabelText("Sugerencias de tus productos")).not.toBeInTheDocument();
  });

  it("muestra chips ordenados por frecuencia con la query vacía", () => {
    seed([{ name: "leche", emoji: "🥛", count: 5 }, { name: "harina", count: 2 }]);
    render(<PantryChips name="" onPick={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("leche");
    expect(buttons[1]).toHaveTextContent("harina");
    const [leche, harina] = buttons;
    expect(leche).toHaveTextContent("🥛");
    expect(harina).not.toHaveTextContent("🥛");
  });

  it("filtra por lo que se escribe y limita a 6", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ name: `leche ${i}`, count: 1 }));
    seed(items);
    render(<PantryChips name="leche" onPick={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("onPick devuelve el nombre del producto", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    seed([{ name: "leche", count: 1 }]);
    render(<PantryChips name="" onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: "Usar leche" }));
    expect(onPick).toHaveBeenCalledWith("leche");
  });
});