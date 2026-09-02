import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListOptionsMenu from "@/components/ListOptionsMenu";

const baseProps = {
  onSort: vi.fn(),
  onDeleteCompleted: vi.fn(),
  hasCompleted: true,
  hideCompleted: false,
  onToggleHideCompleted: vi.fn(),
};

describe("ListOptionsMenu", () => {
  beforeEach(() => {
    baseProps.onSort.mockClear();
    baseProps.onDeleteCompleted.mockClear();
    baseProps.onToggleHideCompleted.mockClear();
  });

  it("abre el menú al hacer click en el botón de opciones", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Ordenar alfabéticamente")).toBeInTheDocument();
    expect(screen.getByText("Ocultar elementos tachados")).toBeInTheDocument();
    expect(screen.getByText("Eliminar completados")).toBeInTheDocument();
  });

  it("muestra 'Mostrar elementos tachados' cuando ya están ocultos", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} hideCompleted />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    expect(screen.getByText("Mostrar elementos tachados")).toBeInTheDocument();
  });

  it("llama onToggleHideCompleted y cierra el menú", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    await user.click(screen.getByText("Ocultar elementos tachados"));
    expect(baseProps.onToggleHideCompleted).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("llama onSort y cierra el menú", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    await user.click(screen.getByText("Ordenar alfabéticamente"));
    expect(baseProps.onSort).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("no muestra 'Compartir lista' cuando canShare es false", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    expect(screen.queryByText("Compartir lista")).not.toBeInTheDocument();
  });

  it("muestra 'Compartir lista' cuando canShare y llama onShare", async () => {
    const onShare = vi.fn();
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} canShare onShare={onShare} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    await user.click(screen.getByText("Compartir lista"));
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it("deshabilita 'Eliminar completados' cuando no hay completados", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} hasCompleted={false} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    const item = screen.getByText("Eliminar completados");
    expect(item.closest("button")).toBeDisabled();
  });

  it("abre el diálogo de confirmación y confirma al pulsar Eliminar", async () => {
    const user = userEvent.setup();
    render(<ListOptionsMenu {...baseProps} />);
    await user.click(screen.getByRole("button", { name: "Opciones de la lista" }));
    await user.click(screen.getByText("Eliminar completados"));
    // El menú se cierra y se abre el diálogo
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Eliminar completados" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(baseProps.onDeleteCompleted).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("dialog", { name: "Eliminar completados" })
    ).not.toBeInTheDocument();
  });
});