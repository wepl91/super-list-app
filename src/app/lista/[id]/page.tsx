"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Hand, ShoppingBasket, Users } from "lucide-react";
import { useListStore } from "@/lib/stores/listStore";
import { usePreferences } from "@/lib/stores/preferencesStore";
import { haptic } from "@/lib/haptics";
import type { NewItemInput } from "@/lib/stores/listStore";
import { useHydrated } from "@/lib/useHydrated";
import ListItemRow from "@/components/ListItemRow";
import ListOptionsMenu from "@/components/ListOptionsMenu";
import LoadingState from "@/components/LoadingState";
import PageTransition from "@/components/PageTransition";
import ProgressSummary from "@/components/ProgressSummary";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddMemberForm from "@/components/AddMemberForm";
import AuthGateCta from "@/components/AuthGateCta";
import EmptyState from "@/components/EmptyState";
import VoiceDictationButton from "@/components/VoiceDictationButton";
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [sharedInfoOpen, setSharedInfoOpen] = useState(false);

  const listId = list?.id;

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

  function resetForm() {
    setName("");
    setDescription("");
    setQuantity(1);
    setUnit("");
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !list) return;
    const input: NewItemInput = { name, description, quantity, unit };
    useListStore.getState().addItem(list.id, input);
    if (focusMode) haptic();
    resetForm();
  }

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
    <div className="mx-auto w-full max-w-lg flex-1 p-6">
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
        focusMode ? (
          <form
            onSubmit={handleAdd}
            className="mb-6 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700"
            aria-label="Añadir elemento"
          >
            <label htmlFor="item-name-focus" className="sr-only">
              Nombre del elemento
            </label>
            <div className="flex items-center gap-2">
              <input
                id="item-name-focus"
                type="text"
                placeholder="Agregar elemento..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-surface px-4 py-3 text-lg text-foreground placeholder:text-placeholder dark:border-zinc-700"
              />
              <VoiceDictationButton
                onInterim={setName}
                onFinal={setName}
                onError={(msg) => setVoiceError(msg)}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-3 text-lg text-white hover:opacity-90"
            >
              Agregar
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleAdd}
            className="mb-6 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700"
            aria-label="Añadir elemento"
          >
        <label htmlFor="item-name" className="sr-only">
          Nombre del elemento
        </label>
        <div className="flex items-center gap-2">
          <input
            id="item-name"
            type="text"
            placeholder="Elemento..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
          <VoiceDictationButton
            onInterim={setName}
            onFinal={setName}
            onError={(msg) => setVoiceError(msg)}
          />
        </div>
        <label htmlFor="item-desc" className="sr-only">
          Descripción (opcional)
        </label>
        <input
          id="item-desc"
          type="text"
          placeholder="Descripción (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
        />
        <div className="flex gap-2">
          <label htmlFor="item-qty" className="sr-only">
            Cantidad
          </label>
          <input
            id="item-qty"
            type="number"
            min={0}
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground dark:border-zinc-700"
          />
          <label htmlFor="item-unit" className="sr-only">
            Unidad (opcional)
          </label>
          <input
            id="item-unit"
            type="text"
            placeholder="Unidad (kg, l...)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
          />
        </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
          >
            Añadir
          </button>
          </form>
        )
      ) : (
        <div className="mb-6">
          <AuthGateCta />
        </div>
      )}

      {list.items.length > 0 && (
        <ProgressSummary total={list.items.length} completed={completed} />
      )}

      {voiceError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {voiceError}
        </p>
      )}

      {visibleItems.length === 0 ? (
        list.items.length === 0 ? (
          <EmptyState
            icon={
              <ShoppingBasket className="h-6 w-6" aria-hidden />
            }
            title="Esta lista está vacía"
            description="Añadí el primer elemento arriba."
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
    </PageTransition>
  );
}
