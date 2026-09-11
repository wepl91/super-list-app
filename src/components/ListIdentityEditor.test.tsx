import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListIdentityEditor from "@/components/ListIdentityEditor";
import type { List } from "@/lib/types";

const { setListIdentity } = vi.hoisted(() => ({ setListIdentity: vi.fn() }));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof listStoreState) => unknown) =>
    sel(listStoreState),
}));

const listStoreState = vi.hoisted(() => ({ setListIdentity }));

const list: List = {
  id: "l1",
  name: "Supermercado",
  items: [],
  position: 0,
  createdAt: 1,
  updatedAt: 1,
  ownerId: "u1",
  role: "owner",
  color: "teal",
  emoji: "🛒",
};

const noIdentity: List = { ...list, id: "l2", color: undefined, emoji: undefined };

function renderEditor(props: Partial<React.ComponentProps<typeof ListIdentityEditor>> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <ListIdentityEditor list={list} open={false} onClose={onClose} {...props} />
  );
  return { onClose, ...utils };
}

describe("ListIdentityEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no renderiza nada cuando open=false", () => {
    renderEditor();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("muestra la identidad actual al abrir", () => {
    renderEditor({ open: true });
    const dialog = screen.getByRole("dialog", { name: "Personalizar lista" });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Color Teal" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("O escribí otro emoji")).toHaveValue("🛒");
  });

  it("para una lista sin identidad usa el default por id y sin emoji", () => {
    render(
      <ListIdentityEditor list={noIdentity} open={true} onClose={vi.fn()} />
    );
    expect(
      screen.getByRole("button", { name: "Sin emoji" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("O escribí otro emoji")).toHaveValue("");
  });

  it("seleccionar otro color actualiza el aria-pressed", async () => {
    const user = userEvent.setup();
    renderEditor({ open: true });
    const rose = screen.getByRole("button", { name: "Color Rosa" });
    expect(rose).toHaveAttribute("aria-pressed", "false");
    await user.click(rose);
    expect(rose).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Color Teal" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("elegir un emoji de la grilla o escribir uno libre setea el input", async () => {
    const user = userEvent.setup();
    renderEditor({ open: true });
    await user.click(screen.getByRole("button", { name: "Emoji 🐟" }));
    expect(screen.getByLabelText("O escribí otro emoji")).toHaveValue("🐟");

    const input = screen.getByLabelText("O escribí otro emoji");
    await user.clear(input);
    await user.type(input, "🧾");
    expect(input).toHaveValue("🧾");
  });

  it("'Sin emoji' limpia el valor del input", async () => {
    const user = userEvent.setup();
    renderEditor({ open: true });
    await user.click(screen.getByRole("button", { name: "Sin emoji" }));
    expect(screen.getByLabelText("O escribí otro emoji")).toHaveValue("");
  });

  it("Guardar persiste color y emoji y cierra", async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor({ open: true });
    await user.click(screen.getByRole("button", { name: "Color Ámbar" }));
    const input = screen.getByLabelText("O escribí otro emoji");
    await user.clear(input);
    await user.type(input, "🐟");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(setListIdentity).toHaveBeenCalledWith("l1", { color: "amber", emoji: "🐟" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Guardar sin emoji persiste solo el color", async () => {
    const user = userEvent.setup();
    renderEditor({ open: true });
    await user.click(screen.getByRole("button", { name: "Sin emoji" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(setListIdentity).toHaveBeenCalledWith("l1", { color: "teal", emoji: undefined });
  });

  it("un emoji inválido muestra error y no guarda", async () => {
    const user = userEvent.setup();
    renderEditor({ open: true });
    const input = screen.getByLabelText("O escribí otro emoji");
    await user.clear(input);
    await user.type(input, "1234");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/no parece un único emoji/i);
    expect(setListIdentity).not.toHaveBeenCalled();
  });

  it("Cancelar no guarda", async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor({ open: true });
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(setListIdentity).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra sin guardar", async () => {
    const user = userEvent.setup();
    const { onClose } = renderEditor({ open: true });
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(setListIdentity).not.toHaveBeenCalled();
  });
});