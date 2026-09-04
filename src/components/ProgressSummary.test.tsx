import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressSummary from "@/components/ProgressSummary";

describe("ProgressSummary", () => {
  it("muestra el contador 'x de y completados' con plural correcto", () => {
    render(<ProgressSummary total={5} completed={3} />);
    expect(screen.getByText("3 de 5 completados")).toBeInTheDocument();
  });

  it("usa singular cuando hay un completado", () => {
    render(<ProgressSummary total={2} completed={1} />);
    expect(screen.getByText("1 de 2 completado")).toBeInTheDocument();
  });

  it("muestra el porcentaje", () => {
    render(<ProgressSummary total={4} completed={1} />);
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("muestra 0% cuando no hay elementos", () => {
    render(<ProgressSummary total={0} completed={0} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("la barra de progreso es accesible con aria", () => {
    render(<ProgressSummary total={10} completed={10} />);
    const bar = screen.getByRole("progressbar", {
      name: "10 de 10 completados",
    });
    expect(bar.getAttribute("aria-valuenow")).toBe("10");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
  });
});