import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListCard from "@/components/ListCard";
import type { List } from "@/lib/types";

const { cloneList, deleteList, renameList, setListSharedMembers, getSharedMemberEmails } =
  vi.hoisted(() => ({
    cloneList: vi.fn(),
    deleteList: vi.fn(),
    renameList: vi.fn(),
    setListSharedMembers: vi.fn(),
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
});
