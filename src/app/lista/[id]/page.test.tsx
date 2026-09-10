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
      emoji: "🍎",
      color: "emerald",
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

vi.mock("@dnd-kit/sortable", () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: () => {},
  sortableKeyboardCoordinates: () => null,
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
    authState.user = { id: "u1" };
    authState.status = "signedIn";
  });

  it("muestra el emoji decorativo de la lista en el header", async () => {
    await renderPage();
    const emoji = screen.getByText("🍎");
    expect(emoji).toHaveAttribute("aria-hidden", "true");
  });

  it("el botón Personalizar lista aparece para el owner", async () => {
    await renderPage();
    expect(
      screen.getByRole("button", { name: "Personalizar lista" })
    ).toBeInTheDocument();
    expect(screen.getByText("🍎")).toBeInTheDocument();
  });

  it("el botón Personalizar lista no aparece para un editor/guest", async () => {
    authState.user = { id: "u2" };
    await renderPage();
    expect(
      screen.queryByRole("button", { name: "Personalizar lista" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("🍎")).toBeInTheDocument();
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

  it("los chips filtran la lista renderizada", async () => {
    const user = userEvent.setup();
    listState.lists[0].items = [
      { id: "i1", name: "Leche", completed: false, position: 0, quantity: 1, createdAt: 0, updatedAt: 0 },
      { id: "i2", name: "Harina", completed: true, position: 1, quantity: 1, createdAt: 0, updatedAt: 0 },
    ] as never;
    await renderPage();

    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pendientes" }));
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Harina")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tachados" }));
    expect(screen.queryByText("Leche")).not.toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Todo" }));
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();
  });

  it("los fijados quedan al tope y sobreviven al filtro", async () => {
    const user = userEvent.setup();
    listState.lists[0].items = [
      { id: "i1", name: "Leche", completed: false, position: 0, pinned: true, quantity: 1, createdAt: 0, updatedAt: 0 },
      { id: "i2", name: "Harina", completed: true, position: 1, quantity: 1, createdAt: 0, updatedAt: 0 },
      { id: "i3", name: "Arroz", completed: false, position: 2, quantity: 1, createdAt: 0, updatedAt: 0 },
    ] as never;
    await renderPage();

    expect(screen.getByText("Fijados (1)")).toBeInTheDocument();
    expect(screen.getByText("Leche")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Tachados" }));
    expect(screen.getByText("Leche")).toBeInTheDocument();
    expect(screen.queryByText("Arroz")).not.toBeInTheDocument();
    expect(screen.getByText("Harina")).toBeInTheDocument();
  });

  it("filtro sin resultados muestra el empty state correspondiente", async () => {
    const user = userEvent.setup();
    listState.lists[0].items = [
      { id: "i1", name: "Leche", completed: false, position: 0, quantity: 1, createdAt: 0, updatedAt: 0 },
    ] as never;
    await renderPage();

    await user.click(screen.getByRole("button", { name: "Tachados" }));
    expect(screen.getByText("No hay elementos tachados")).toBeInTheDocument();
  });
});