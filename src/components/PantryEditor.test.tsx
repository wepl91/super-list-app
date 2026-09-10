import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PantryEditor from "./PantryEditor";
import { usePantry } from "@/lib/stores/pantryStore";

describe("PantryEditor", () => {
  beforeEach(() => {
    localStorage.clear();
    usePantry.setState({ products: [] });
  });

  it("muestra el empty state cuando no hay productos", () => {
    render(<PantryEditor />);
    expect(
      screen.getByText(/Todavía no tenés productos/)
    ).toBeInTheDocument();
  });

  it("lista los productos con sus usos", () => {
    const { upsertProduct, recordItem } = usePantry.getState();
    upsertProduct({ name: "leche", emoji: "🥛", aisle: "Lácteos" });
    recordItem("leche");
    recordItem("leche");
    render(<PantryEditor />);
    expect(screen.getByText("leche")).toBeInTheDocument();
    expect(screen.getByText(/Lácteos/)).toBeInTheDocument();
    expect(screen.getByText(/2 usos/)).toBeInTheDocument();
  });

  it("filtra por búsqueda y muestra empty state de sin resultados", async () => {
    const user = userEvent.setup();
    usePantry.getState().upsertProduct({ name: "leche" });
    render(<PantryEditor />);
    await user.type(screen.getByLabelText("Buscar en la despensa"), "pan");
    expect(screen.queryByText("leche")).not.toBeInTheDocument();
    expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
  });

  it("agrega un producto manualmente", async () => {
    const user = userEvent.setup();
    render(<PantryEditor />);
    await user.click(screen.getByRole("button", { name: "Agregar producto" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Nombre"), "Arroz");
    await user.type(within(dialog).getByLabelText(/Emoji/), "🍚");
    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(screen.getByText("Arroz")).toBeInTheDocument();
    expect(screen.getByText("🍚")).toBeInTheDocument();
    expect(usePantry.getState().products).toHaveLength(1);
  });

  it("edita un producto existente", async () => {
    const user = userEvent.setup();
    usePantry.getState().upsertProduct({ name: "leche" });
    render(<PantryEditor />);
    await user.click(screen.getByRole("button", { name: "Editar leche" }));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Leche entera");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(usePantry.getState().products[0].name).toBe("Leche entera");
    expect(screen.getByText("Leche entera")).toBeInTheDocument();
  });

  it("no guarda con nombre vacío en el diálogo", async () => {
    const user = userEvent.setup();
    usePantry.getState().upsertProduct({ name: "leche" });
    render(<PantryEditor />);
    await user.click(screen.getByRole("button", { name: "Editar leche" }));
    await user.clear(screen.getByLabelText("Nombre"));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(usePantry.getState().products[0].name).toBe("leche");
  });

  it("elimina un producto con confirmación", async () => {
    const user = userEvent.setup();
    usePantry.getState().upsertProduct({ name: "leche" });
    render(<PantryEditor />);
    await user.click(screen.getByRole("button", { name: "Eliminar leche" }));
    expect(usePantry.getState().products).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(usePantry.getState().products).toEqual([]);
  });
});