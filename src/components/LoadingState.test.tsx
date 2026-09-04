import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LoadingState from "@/components/LoadingState";

describe("LoadingState", () => {
  it("por defecto renderiza el skeleton de home con rol status", () => {
    render(<LoadingState />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(screen.getByText("Mis listas")).toBeInTheDocument();
  });

  it("renderiza el skeleton de detalle en su variante", () => {
    render(<LoadingState variant="detail" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
