import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

const { lists, ready, reorderLists } = vi.hoisted(() => ({
  lists: [] as { id: string; position: number }[],
  ready: true,
  reorderLists: vi.fn(),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof storeState) => unknown) =>
    sel(storeState),
}));

const storeState = vi.hoisted(() => ({ lists, ready, reorderLists }));

const authStatus = vi.hoisted(() => ({ value: "signedIn" as string }));

vi.mock("@/lib/useHydrated", () => ({ useHydrated: () => true }));
vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({ status: authStatus.value }),
}));
vi.mock("@/components/CreateListDialog", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">CreateListDialog</div> : null,
}));
vi.mock("@/components/AuthGateCta", () => ({
  default: () => <div>AuthGateCta</div>,
}));
vi.mock("@/components/UserMenu", () => ({ default: () => null }));
vi.mock("@/components/ThemeToggle", () => ({ default: () => null }));

describe("Home (smoke)", () => {
  it("muestra la home con FAB y sin diálogo", () => {
    render(<Home />);
    expect(screen.getByText("Super List")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear lista" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("AuthGateCta")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mi despensa" })).toHaveAttribute(
      "href",
      "/despensa"
    );
  });

  it("abre el diálogo al tocar el FAB", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Crear lista" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("muestra el CTA de login cuando no hay sesión y oculta el FAB", () => {
    authStatus.value = "signedOut";
    render(<Home />);
    expect(screen.getByText("AuthGateCta")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Crear lista" })
    ).not.toBeInTheDocument();
  });
});