"use client";

import { useRef, useState } from "react";
import { Plus, ShoppingBasket } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import ListCard from "@/components/ListCard";
import CreateListDialog from "@/components/CreateListDialog";
import LoadingState from "@/components/LoadingState";
import PageTransition from "@/components/PageTransition";
import { useListStore } from "@/lib/stores/listStore";
import { useHydrated } from "@/lib/useHydrated";
import { useAuth } from "@/lib/supabase/auth";
import type { List } from "@/lib/types";
import AuthGateCta from "@/components/AuthGateCta";
import EmptyState from "@/components/EmptyState";
import InstallPrompt from "@/components/InstallPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

export default function Home() {
  const lists = useListStore((s) => s.lists);
  const reorderLists = useListStore((s) => s.reorderLists);
  const ready = useListStore((s) => s.ready);
  const hydrated = useHydrated();
  const { status } = useAuth();
  const isSignedIn = status === "signedIn";

  const byPosition = (a: List, b: List) => a.position - b.position;
  const myLists = lists.filter((l) => l.role === "owner").sort(byPosition);
  const sharedLists = lists.filter((l) => l.role === "editor").sort(byPosition);

  const [createOpen, setCreateOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashList(id: string) {
    setHighlightedId(id);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedId(null), 700);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!isSignedIn) return; // la UI ya bloquea sin sesión
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderLists(String(active.id), String(over.id));
    }
  }

  return (
    <PageTransition>
    <div className="mx-auto w-full max-w-lg flex-1 p-6 pb-24">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Super List</h1>
          <p className="text-sm text-text-secondary">
            Tus listas de compra y tareas.
          </p>
        </div>
        <div className="relative flex items-center gap-1">
          <UserMenu />
          <ThemeToggle />
        </div>
      </header>

      {!isSignedIn && (
        <div className="mb-6">
          <AuthGateCta />
        </div>
      )}

      {status === "loading" || (isSignedIn && !ready) ? (
        <LoadingState />
      ) : (
        hydrated && (
          <div className="flex flex-col gap-6">
            <section aria-label="Mis listas">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Mis listas
              </h2>
              {myLists.length === 0 ? (
                <EmptyState
                  icon={
                    <ShoppingBasket className="h-6 w-6" aria-hidden />
                  }
                  title="Tus listas aparecen acá"
                  description="Aún no tenés listas. Tocá el botón + para crear la primera."
                  action={
                    isSignedIn ? (
                      <button
                        type="button"
                        onClick={() => setCreateOpen(true)}
                        className="btn-base btn-primary px-4 py-2 text-sm"
                      >
                        Crear la primera lista
                      </button>
                    ) : undefined
                  }
                />
              ) : isSignedIn ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={myLists.map((l) => l.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="flex flex-col gap-2">
                      {myLists.map((list) => (
                        <ListCard
                          key={list.id}
                          list={list}
                          isOwner
                          highlighted={list.id === highlightedId}
                        />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              ) : (
                <ul className="flex flex-col gap-2">
                  {myLists.map((list) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      isOwner
                      isReadOnly
                      highlighted={list.id === highlightedId}
                    />
                  ))}
                </ul>
              )}
            </section>

            {sharedLists.length > 0 && (
              <section aria-label="Listas compartidas">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Compartidas conmigo
                </h2>
                <ul className="flex flex-col gap-2">
                  {sharedLists.map((list) => (
                    <ListCard key={list.id} list={list} isOwner={false} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )
      )}

      <div className="mt-8 flex flex-col gap-4">
        <InstallPrompt />
      </div>
    </div>

    {isSignedIn && (
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        aria-label="Crear lista"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
      >
        <Plus className="h-7 w-7" aria-hidden />
      </button>
    )}

    <CreateListDialog
      open={createOpen}
      onClose={() => setCreateOpen(false)}
      onCreated={flashList}
    />
    </PageTransition>
  );
}
