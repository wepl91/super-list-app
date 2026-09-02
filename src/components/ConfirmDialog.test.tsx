import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmDialog from "@/components/ConfirmDialog";

describe("ConfirmDialog", () => {
  let onConfirm: ReturnType<typeof vi.fn<() => void>>;
  let onCancel: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onConfirm = vi.fn<() => void>();
    onCancel = vi.fn<() => void>();
  });

  const baseProps = () => ({
    open: true,
    title: "Eliminar lista",
    message: "¿Seguro que querés continuar?",
    onConfirm,
    onCancel,
  });

  it("no renderiza nada si está cerrado", () => {
    const { container } = render(
      <ConfirmDialog {...baseProps()} open={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra título, mensaje y botones por defecto", () => {
    render(<ConfirmDialog {...baseProps()} />);
    expect(
      screen.getByRole("dialog", { name: "Eliminar lista" })
    ).toBeInTheDocument();
    expect(screen.getByText("¿Seguro que querés continuar?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("permite labels custom y variante destructiva", () => {
    render(
      <ConfirmDialog
        {...baseProps()}
        confirmLabel="Eliminar"
        cancelLabel="Volver"
        destructive
      />
    );
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
  });

  it("confirma al hacer click en el botón de confirmar", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...baseProps()} confirmLabel="Eliminar" />);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancela al hacer click en cancelar", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...baseProps()} cancelLabel="Volver" />);
    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancela al presionar Escape", async () => {
    const user = userEvent.setup();
    render(<ConfirmDialog {...baseProps()} />);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancela al hacer click en el backdrop", async () => {
    const user = userEvent.setup();
    const { container } = render(<ConfirmDialog {...baseProps()} />);
    const backdrop = container.querySelector(".absolute.inset-0");
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("enfoca el botón de confirmar al abrir", () => {
    render(<ConfirmDialog {...baseProps()} confirmLabel="Eliminar" />);
    expect(screen.getByRole("button", { name: "Eliminar" })).toHaveFocus();
  });

  it("en variante info muestra solo el botón de cierre", () => {
    render(
      <ConfirmDialog
        {...baseProps()}
        variant="info"
        confirmLabel="Listo"
        message={<ul><li>a@b.com</li></ul>}
      />
    );
    expect(screen.getByText("a@b.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Listo" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar" })
    ).not.toBeInTheDocument();
  });
});