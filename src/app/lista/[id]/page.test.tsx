import { Suspense, act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListDetailPage from "@/app/lista/[id]/page";

const listState = vi.hoisted(() => ({
  lists: [
    {
      id: "l1",
      name: "Feria",
      ownerId: "u1",
      items: [] as never[],
      position: 0,
      sharedMembers: [],
    },
  ],
  ready: true,
  setListSharedMembers: vi.fn(),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof listState) => unknown) =>
    sel(listState),
  __esModule: true,
  default: { getState: () => listState },
}));

const authState = vi.hoisted(() => ({
  user: { id: "u1" } as { id: string } | null,
  status: "signedIn" as string,
}));

vi.mock("@/lib/useHydrated", () => ({ useHydrated: () => true }));
vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({ user: authState.user, status: authState.status }),
}));

const prefState = vi.hoisted(() => ({
  focusMode: false,
  setFocusMode: vi.fn(),
  hideCompleted: false,
  setHideCompleted: vi.fn(),
}));

vi.mock("@/lib/stores/preferencesStore", () => ({
  usePreferences: (sel: (state: typeof prefState) => unknown) =>
    sel(prefState),
}));

vi.mock("@/app/supabase-actions", () => ({
  getSharedMemberEmails: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/components/ListOptionsMenu", () => ({ default: () => null }));
vi.mock("@/components/AuthGateCta", () => ({
  default: () => <div>AuthGateCta</div>,
}));

async function renderPage() {
  await act(async () => {
    render(
      <Suspense fallback={<div>o</div>}>
        <ListDetailPage params={Promise.resolve({ id: "l1" })} />
      </Suspense>
    );
  });
  await screen.findByRole("heading", { name: "Feria" });
  return { container: document.body };
}

describe("ListDetailPage (smoke)", () => {
  beforeEach(() => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.matchMedia = (() => ({
      matches: false,
      media: "",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });

  it("muestra el FAB cerrado y sin form al navegar con sesión", async () => {
    await renderPage();
    const fab = screen.getByRole("button", { name: "Añadir elemento" });
    expect(fab).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(
      screen.getByText("Añadí el primer elemento tocando el botón +.")
    ).toBeInTheDocument();
  });

  it("el toggle del FAB abre y cierra el form con foco", async () => {
    const user = userEvent.setup();
    await renderPage();

    const fab = screen.getByRole("button", { name: "Añadir elemento" });
    await user.click(fab);

    expect(screen.getByRole("form")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Cerrar formulario" })
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Nombre del elemento")).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cerrar formulario" }));

    const wrapper = document.querySelector(".collapse-form");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    fireEvent.transitionEnd(wrapper as Element);

    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Añadir elemento" })).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });

  it("Escape cierra el form y devuelve el foco al FAB", async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Añadir elemento" }));
    expect(screen.getByRole("form")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    const wrapper = document.querySelector(".collapse-form");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    fireEvent.transitionEnd(wrapper as Element);

    await waitFor(() =>
      expect(screen.queryByRole("form")).not.toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: "Añadir elemento" })).toHaveFocus();
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });

  it("sin sesión no muestra FAB y sí AuthGateCta", async () => {
    authState.user = null;
    authState.status = "signedOut";
    await renderPage();
    expect(
      screen.queryByRole("button", { name: "Añadir elemento" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("AuthGateCta")).toBeInTheDocument();
  });
});