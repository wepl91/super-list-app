import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListFilterChips from "./ListFilterChips";

describe("ListFilterChips", () => {
  it("es un grupo con aria-label y tres chips", () => {
    render(<ListFilterChips filter="all" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Filtrar elementos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tachados" })).toBeInTheDocument();
  });

  it("marca con aria-pressed el filtro activo", () => {
    const { rerender } = render(<ListFilterChips filter="all" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "false");

    rerender(<ListFilterChips filter="pending" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "true");

    rerender(<ListFilterChips filter="done" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Tachados" })).toHaveAttribute("aria-pressed", "true");
  });

  it("notifica el filtro elegido al hacer click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ListFilterChips filter="all" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Pendientes" }));
    expect(onChange).toHaveBeenCalledWith("pending");
    await user.click(screen.getByRole("button", { name: "Tachados" }));
    expect(onChange).toHaveBeenCalledWith("done");
  });

  it("la variante foco agranda los targets", () => {
    render(<ListFilterChips filter="all" onChange={() => {}} focusMode />);
    expect(screen.getByRole("button", { name: "Todo" })).toHaveClass("py-3", "text-base");
  });
});