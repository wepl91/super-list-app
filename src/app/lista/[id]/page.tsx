"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hand, Plus, ShoppingBasket, Users, X } from "lucide-react";
import { useListStore } from "@/lib/stores/listStore";
import { usePreferences } from "@/lib/stores/preferencesStore";
import { useHydrated } from "@/lib/useHydrated";
import ListItemRow from "@/components/ListItemRow";
import ListOptionsMenu from "@/components/ListOptionsMenu";
import LoadingState from "@/components/LoadingState";
import PageTransition from "@/components/PageTransition";
import ProgressSummary from "@/components/ProgressSummary";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddMemberForm from "@/components/AddMemberForm";
import AddItemForm from "@/components/AddItemForm";
import AuthGateCta from "@/components/AuthGateCta";
import EmptyState from "@/components/EmptyState";
import { useAuth } from "@/lib/supabase/auth";
import { getSharedMemberEmails } from "@/app/supabase-actions";

export default function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const list = useListStore((s) => s.lists.find((l) => l.id === id));
  const ready = useListStore((s) => s.ready);
  const hydrated = useHydrated();
  const { user, status } = useAuth();
  const isSignedIn = status === "signedIn";
  const focusMode = usePreferences((s) => s.focusMode);
  const setFocusMode = usePreferences((s) => s.setFocusMode);
  const hideCompleted = usePreferences((s) => s.hideCompleted);
  const setHideCompleted = usePreferences((s) => s.setHideCompleted);

  const isOwner = !!user && !!list && list.ownerId === user.id;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharedInfoOpen, setSharedInfoOpen] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addFormClosing, setAddFormClosing] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const listId = list?.id;

  function openForm() {
    setAddFormClosing(false);
    setAddFormOpen(true);
  }

  function requestClose() {
    if (addFormOpen && !addFormClosing) setAddFormClosing(true);
  }

  function completeClose() {
    setAddFormOpen(false);
    setAddFormClosing(false);
    fabRef.current?.focus();
    if (typeof window.scrollTo === "function") {
      const reduce = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: reduce ? "auto" : "smooth",
      });
    }
  }

  function toggleForm() {
    if (addFormOpen) requestClose();
    else openForm();
  }

  useEffect(() => {
    if (!isSignedIn || !isOwner || !listId) return;
    let cancelled = false;
    getSharedMemberEmails()
      .then((shared) => {
        if (cancelled) return;
        const members = shared
          .filter((s) => s.listId === listId)
          .map((s) => ({ userId: s.userId, email: s.email }));
        useListStore.getState().setListSharedMembers(listId, members);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isOwner, listId]);

  const hasList = list !== undefined;

  function handleSaveEdit(input: { name: string; description?: string; quantity: number; unit?: string }) {
    if (!list) return;
    useListStore.getState().updateItem(list.id, editingId!, input);
    setEditingId(null);
  }

  const hasCompleted = (list?.items ?? []).some((i) => i.completed);

  // Si hay sesión, no renderizar desde la caché local hasta que el primer
  // sync cloud resuelva, para evitar el parpadeo (badge de compartida,
  // estado de sync, elementos) entre un frame y el siguiente. También se
  // espera mientras la sesión se restaura (status loading) para no mostrar
  // data de caché que aún podría no corresponder.
  if (!hydrated || status === "loading" || (isSignedIn && !ready)) {
    return (
      <PageTransition>
        <div className="mx-auto w-full max-w-lg flex-1 p-6">
          <LoadingState variant="detail" />
        </div>
      </PageTransition>
    );
  }

  if (!hasList) {
    return (
      <PageTransition>
        <div className="mx-auto w-full max-w-lg flex-1 p-6">
          <p className="text-sm text-text-secondary">
            Lista no encontrada.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </PageTransition>
    );
  }

  const completed = list.items.filter((i) => i.completed).length;
  const visibleItems = hideCompleted
    ? list.items.filter((i) => !i.completed)
    : list.items;
  const pendingItems = list.items.filter((i) => !i.completed);
  const doneItems = list.items.filter((i) => i.completed);

  return (
    <PageTransition>
    <div className="mx-auto w-full max-w-lg flex-1 p-6 pb-24">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-1">
          <Link
            href="/"
            aria-label="Volver al inicio"
            className="mt-1 rounded-lg p-0.5 text-primary transition-colors hover:opacity-80"
          >
            <ArrowLeft className="h-6 w-6" aria-hidden />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-2xl font-bold text-primary">{list.name}</h1>
              {isOwner && list.sharedMembers && list.sharedMembers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSharedInfoOpen(true)}
                  aria-label="Ver quiénes comparten esta lista"
                  title="Ver quiénes comparten esta lista"
                  className="-m-1 rounded-md p-1 text-text-secondary transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <Users
                    className="h-4 w-4"
                    aria-hidden
                  />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setFocusMode(!focusMode)}
            aria-pressed={focusMode}
            title={focusMode ? "Salir del modo foco" : "Modo foco (una sola mano)"}
            className={`rounded-lg p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
              focusMode ? "text-primary" : "text-text-secondary"
            }`}
          >
            <Hand className="h-5 w-5" aria-hidden />
          </button>
          {isSignedIn && (
            <ListOptionsMenu
              onSort={() => useListStore.getState().sortItems(list.id)}
              onDeleteCompleted={() =>
                useListStore.getState().deleteCompletedItems(list.id)
              }
              hasCompleted={hasCompleted}
              hideCompleted={hideCompleted}
              onToggleHideCompleted={() => setHideCompleted(!hideCompleted)}
              onShare={() => setShareOpen((v) => !v)}
              canShare={isOwner}
            />
          )}
        </div>
      </header>

      {shareOpen && isOwner && isSignedIn && (
        <div className="mb-4">
          <AddMemberForm listId={list.id} onClose={() => setShareOpen(false)} />
        </div>
      )}

      {isSignedIn ? (
        addFormOpen && (
          <AddItemForm
            listId={list.id}
            focusMode={focusMode}
            closing={addFormClosing}
            onClose={requestClose}
            onExited={completeClose}
          />
        )
      ) : (
        <div className="mb-6">
          <AuthGateCta />
        </div>
      )}

      {list.items.length > 0 && (
        <ProgressSummary total={list.items.length} completed={completed} />
      )}

      {visibleItems.length === 0 ? (
        list.items.length === 0 ? (
          <EmptyState
            icon={
              <ShoppingBasket className="h-6 w-6" aria-hidden />
            }
            title="Esta lista está vacía"
            description="Añadí el primer elemento tocando el botón +."
          />
        ) : (
          <EmptyState
            icon={
              <ShoppingBasket className="h-6 w-6" aria-hidden />
            }
            title="No hay elementos pendientes"
            description={`${list.items.length} element${list.items.length === 1 ? "" : "s"} completado${completed === 1 ? "" : "s"}.`}
          />
        )
      ) : (
        <div className="flex flex-col gap-4">
          {pendingItems.length > 0 && (
            <section aria-label="Pendientes">
              <ul className="flex flex-col gap-2">
                {pendingItems.map((item) => (
                  <ListItemRow
                    key={item.id}
                    listId={list.id}
                    item={item}
                    editing={editingId === item.id && isSignedIn}
                    onEdit={() => setEditingId(item.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={handleSaveEdit}
                    isReadOnly={!isSignedIn}
                    focusMode={focusMode}
                  />
                ))}
              </ul>
            </section>
          )}
          {!hideCompleted && doneItems.length > 0 && (
            <section aria-label="Completados">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Completados ({doneItems.length})
              </h3>
              <ul className="flex flex-col gap-2">
                {doneItems.map((item) => (
                  <ListItemRow
                    key={item.id}
                    listId={list.id}
                    item={item}
                    editing={editingId === item.id && isSignedIn}
                    onEdit={() => setEditingId(item.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={handleSaveEdit}
                    isReadOnly={!isSignedIn}
                    focusMode={focusMode}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={sharedInfoOpen}
        variant="info"
        title="Compartido"
        message={
          <ul className="space-y-1">
            {list.sharedMembers?.map((m) => (
              <li key={m.userId}>{m.email}</li>
            ))}
          </ul>
        }
        confirmLabel="Listo"
        onConfirm={() => setSharedInfoOpen(false)}
        onCancel={() => setSharedInfoOpen(false)}
      />
    </div>

    {isSignedIn && (
      <button
        type="button"
        ref={fabRef}
        onClick={toggleForm}
        aria-label={
          addFormOpen && !addFormClosing ? "Cerrar formulario" : "Añadir elemento"
        }
        aria-expanded={addFormOpen && !addFormClosing}
        aria-controls="add-item-form"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
      >
        {addFormOpen && !addFormClosing ? (
          <X className="h-7 w-7" aria-hidden />
        ) : (
          <Plus className="h-7 w-7" aria-hidden />
        )}
      </button>
    )}
    </PageTransition>
  );
}
