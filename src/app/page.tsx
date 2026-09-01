"use client";

import { useState } from "react";
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
import { useListStore } from "@/lib/stores/listStore";
import { useHydrated } from "@/lib/useHydrated";
import { useAuth } from "@/lib/supabase/auth";
import AuthGateCta from "@/components/AuthGateCta";
import InstallPrompt from "@/components/InstallPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";

export default function Home() {
  const lists = useListStore((s) => s.lists);
  const createList = useListStore((s) => s.createList);
  const reorderLists = useListStore((s) => s.reorderLists);
  const hydrated = useHydrated();
  const { status } = useAuth();
  const isSignedIn = status === "signedIn";

  const myLists = lists.filter((l) => l.role === "owner");
  const sharedLists = lists.filter((l) => l.role === "editor");

  const [newName, setNewName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignedIn) return; // la UI ya bloquea sin sesión
    if (!newName.trim()) return;
    createList(newName);
    setNewName("");
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!isSignedIn) return; // la UI ya bloquea sin sesión
    const { active, over } = event;
    if (over && active.id !== over.id) {
      reorderLists(String(active.id), String(over.id));
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg flex-1 p-6">
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

      {isSignedIn ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex gap-2"
          aria-label="Crear lista"
        >
          <label htmlFor="new-list-name" className="sr-only">
            Nombre de la lista
          </label>
          <input
            id="new-list-name"
            type="text"
            placeholder="Nueva lista..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Crear
          </button>
        </form>
      ) : (
        <div className="mb-6">
          <AuthGateCta />
        </div>
      )}

      {hydrated && (
        <div className="flex flex-col gap-6">
          <section aria-label="Mis listas">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Mis listas
            </h2>
            {myLists.length === 0 ? (
              <p className="text-sm text-text-secondary">
                Aún no tienes listas. Crea la primera arriba.
              </p>
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
                      <ListCard key={list.id} list={list} isOwner />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            ) : (
              <ul className="flex flex-col gap-2">
                {myLists.map((list) => (
                  <ListCard key={list.id} list={list} isOwner isReadOnly />
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
      )}

      <div className="mt-8 flex flex-col gap-4">
        <InstallPrompt />
      </div>
    </div>
  );
}
