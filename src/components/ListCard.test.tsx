import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListCard from "@/components/ListCard";
import type { List } from "@/lib/types";

const { cloneList, deleteList, renameList, setListSharedMembers, setListIdentity, getSharedMemberEmails } =
  vi.hoisted(() => ({
    cloneList: vi.fn(),
    deleteList: vi.fn(),
    renameList: vi.fn(),
    setListSharedMembers: vi.fn(),
    setListIdentity: vi.fn(),
    getSharedMemberEmails: vi.fn(),
  }));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/stores/listStore", () => ({
  useListStore: (sel: (state: typeof storeState) => unknown) =>
    sel(storeState),
}));

const storeState = vi.hoisted(() => ({
  cloneList,
  deleteList,
  renameList,
  setListSharedMembers,
  setListIdentity,
}));

vi.mock("@/lib/supabase/auth", () => ({
  useAuth: () => ({ status: "signedIn", user: { id: "u1" } }),
}));

vi.mock("@/components/AddMemberForm", () => ({
  default: () => <div>AddMemberForm stub</div>,
}));

vi.mock("@/app/supabase-actions", () => ({
  addMemberByEmail: vi.fn(),
  getSharedMemberEmails,
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
}));

const mockUser: List = {
  id: "l1",
  name: "Supermercado",
  items: [],
  position: 0,
  createdAt: 1,
  updatedAt: 1,
  ownerId: "u1",
  role: "owner",
};

describe("ListCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeState.renameList.mockImplementation((id: string, name: string) => name);
  });

  it("muestra el tag Compartida cuando sharedCount > 0 (determinista)", () => {
    render(
      <ListCard
        list={{ ...mockUser, sharedCount: 2, sharedMembers: [] }}
      />
    );
    expect(
      screen.getByRole("button", { name: /Ver con quién se compartió/ })
    ).toBeInTheDocument();
  });

  it("no muestra el tag Compartida sin sharedCount, aunque haya sharedMembers", () => {
    render(
      <ListCard
        list={{
          ...mockUser,
          sharedMembers: [{ userId: "u2", email: "a@b.com" }],
        }}
      />
    );
    expect(
      screen.queryByRole("button", { name: /Ver con quién se compartió/ })
    ).not.toBeInTheDocument();
  });

  it("no muestra el tag en listas compartidas conmigo (isOwner false), aunque tengan sharedCount", () => {
    render(<ListCard list={{ ...mockUser, sharedCount: 1 }} isOwner={false} />);
    expect(
      screen.queryByRole("button", { name: /Ver con quién se compartió/ })
    ).not.toBeInTheDocument();
  });

  it("abre el modal al hacer click en el tag y fetchea miembros on-demand", async () => {
    getSharedMemberEmails.mockResolvedValue([
      { listId: "l1", userId: "u2", email: "a@b.com" },
    ]);
    const user = userEvent.setup();
    render(<ListCard list={{ ...mockUser, sharedCount: 1 }} />);

    await user.click(
      screen.getByRole("button", { name: /Ver con quién se compartió/ })
    );

    expect(getSharedMemberEmails).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole("dialog", { name: "Compartida" })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(setListSharedMembers).toHaveBeenCalledWith("l1", [
        { userId: "u2", email: "a@b.com" },
      ])
    );
  });

  it("muestra el emoji decorativo y el acento de color elegidos", () => {
    const { container } = render(
      <ListCard list={{ ...mockUser, color: "teal", emoji: "🛒" }} />
    );
    const emoji = screen.getByText("🛒");
    expect(emoji).toHaveAttribute("aria-hidden", "true");
    const li = container.querySelector("li") as HTMLElement;
    expect(li.style.borderLeftWidth).toBe("3px");
    expect(li.style.borderLeftColor).toBe("rgb(20, 184, 166)");
  });

  it("muestra la identidad también en listas compartidas conmigo (isOwner false)", () => {
    const { container } = render(
      <ListCard
        list={{ ...mockUser, color: "rose", emoji: "🧾" }}
        isOwner={false}
      />
    );
    expect(screen.getByText("🧾")).toHaveAttribute("aria-hidden", "true");
    const li = container.querySelector("li") as HTMLElement;
    expect(li.style.borderLeftColor).toBe("rgb(244, 63, 94)");
  });

  it("sin identidad aplica un acento determinístico por id (no rompe)", () => {
    const { container } = render(<ListCard list={mockUser} />);
    const li = container.querySelector("li") as HTMLElement;
    expect(li.style.borderLeftWidth).toBe("3px");
    expect(li.style.borderLeftColor).toMatch(/^rgb\(/);
  });

  it("el menú 'Personalizar' (owner) abre el editor y Guardar persiste la identidad", async () => {
    const user = userEvent.setup();
    render(<ListCard list={{ ...mockUser, color: "teal" }} />);
    await user.click(screen.getByRole("button", { name: /Opciones de/ }));

    await user.click(screen.getByRole("menuitem", { name: "Personalizar" }));

    expect(
      screen.getByRole("dialog", { name: "Personalizar lista" })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    expect(setListIdentity).toHaveBeenCalledWith("l1", {
      color: "teal",
      emoji: undefined,
    });
  });

  it("sin isOwner no hay menú para personalizar", () => {
    render(<ListCard list={{ ...mockUser, color: "amber" }} isOwner={false} isReadOnly />);
    expect(
      screen.queryByRole("button", { name: /Opciones de/ })
    ).not.toBeInTheDocument();
  });
});
