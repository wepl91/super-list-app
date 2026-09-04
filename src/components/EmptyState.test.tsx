import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "@/components/EmptyState";

describe("EmptyState", () => {
  it("muestra título y descripción", () => {
    render(<EmptyState title="Sin listas" description="Creá una arriba." />);
    expect(screen.getByText("Sin listas")).toBeInTheDocument();
    expect(screen.getByText("Creá una arriba.")).toBeInTheDocument();
  });

  it("es opcional no mostrar descripción", () => {
    render(<EmptyState title="Solo título" />);
    expect(screen.getByText("Solo título")).toBeInTheDocument();
    expect(screen.queryByText(/creá/i)).not.toBeInTheDocument();
  });

  it("renderiza el icono cuando se provee", () => {
    render(<EmptyState title="T" icon={<span>🗒️</span>} />);
    expect(screen.getByText("🗒️")).toBeInTheDocument();
  });

  it("renderiza la acción cuando se provee", () => {
    render(
      <EmptyState
        title="T"
        action={<button type="button">Crear</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
  });

  it("no renderiza acción si no se provee", () => {
    render(<EmptyState title="T" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});