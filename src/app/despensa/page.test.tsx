import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DespensaPage from "./page";

vi.mock("@/components/PantryEditor", () => ({
  default: () => <div>PantryEditor</div>,
}));

describe("DespensaPage (smoke)", () => {
  it("muestra el encabezado, el link de vuelta y el editor", () => {
    render(<DespensaPage />);
    expect(screen.getByRole("heading", { name: "Mi despensa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(screen.getByText("PantryEditor")).toBeInTheDocument();
  });
});