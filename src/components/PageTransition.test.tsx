import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PageTransition from "@/components/PageTransition";

describe("PageTransition", () => {
  it("renderiza el contenido dentro del contenedor con animación", () => {
    render(
      <PageTransition>
        <p>Contenido</p>
      </PageTransition>
    );
    const content = screen.getByText("Contenido");
    expect(content).toBeInTheDocument();
    expect(content.closest(".animate-fade-in")).not.toBeNull();
  });
});