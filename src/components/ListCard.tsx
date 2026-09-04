"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CircleCheck,
  Clock,
  Copy,
  EllipsisVertical,
  GripVertical,
  HardDrive,
  Pencil,
  RefreshCw,
  Share,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { List } from "@/lib/types";
import { useListStore } from "@/lib/stores/listStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getSharedMemberEmails } from "@/app/supabase-actions";
import AddMemberForm from "@/components/AddMemberForm";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ListCardProps {
  list: List;
  isOwner?: boolean;
  /** Modo solo lectura (sin sesión): oculta las acciones de escritura. */
  isReadOnly?: boolean;
  /** Resaltar la card brevemente (ej. recién creada/duplicada). */
  highlighted?: boolean;
}

export default function ListCard({
  list,
  isOwner = true,
  isReadOnly = false,
  highlighted = false,
}: ListCardProps) {
  const cloneList = useListStore((s) => s.cloneList);
  const deleteList = useListStore((s) => s.deleteList);
  const renameList = useListStore((s) => s.renameList);
  const setListSharedMembers = useListStore((s) => s.setListSharedMembers);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [syncTipOpen, setSyncTipOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [flashSelf, setFlashSelf] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!syncTipOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSyncTipOpen(false);
    }
    function handlePointer(e: PointerEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setSyncTipOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [syncTipOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [menuOpen]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id, disabled: !isOwner || isReadOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const completed = list.items.filter((i) => i.completed).length;
  // El tag "Compartida" solo tiene sentido en las listas propias (isOwner):
  // es el dato de con quién las compartimos. Las listas compartidas conmigo
  // son de otros, así que no muestran a quiénes les pertenecen. Deriva de
  // sharedCount (traído por el pull cloud de forma determinista) y no del
  // fetch de emails, que solo corre on-demand al abrir el modal de miembros.
  const isShared = isOwner && (list.sharedCount ?? 0) > 0;
  const progressPct =
    list.items.length > 0 ? Math.round((completed / list.items.length) * 100) : 0;

  function handleDelete() {
    setMenuOpen(false);
    setDeleteOpen(true);
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (trimmed) renameList(list.id, trimmed);
    setEditOpen(false);
    setMenuOpen(false);
  }

  const status = list.syncStatus ?? "local";
  const statusMeta: Record<string, { title: string; cls: string }> = {
    synced: {
      title: "Sincronizada con la nube",
      cls: "text-emerald-600 dark:text-emerald-400",
    },
    syncing: {
      title: "Sincronizando...",
      cls: "text-sky-600 dark:text-sky-400",
    },
    dirty: {
      title: "Cambios pendientes de subir",
      cls: "text-amber-600 dark:text-amber-400",
    },
    local: {
      title: "Solo en este dispositivo (sin sesión)",
      cls: "text-text-secondary",
    },
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-zinc-200 bg-surface shadow-sm transition-shadow dark:border-zinc-700 ${
        isDragging
          ? "z-10 scale-[1.02] opacity-90 shadow-lg ring-2 ring-primary/50"
          : ""
      } ${highlighted || flashSelf ? "animate-row-pop" : ""}`}
    >
      <div className="flex items-center gap-3 p-3">
        {isOwner && !isReadOnly && (
          <button
            type="button"
            aria-label={`Reordenar ${list.name}`}
            className="cursor-grab touch-none rounded p-1 text-text-secondary hover:text-foreground active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
        )}

        <div ref={statusRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSyncTipOpen((v) => !v)}
            aria-label={statusMeta[status].title}
            aria-haspopup="true"
            aria-expanded={syncTipOpen}
            className={`group rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${statusMeta[status].cls}`}
          >
            {status === "synced" && (
                <CircleCheck className="h-4 w-4" aria-hidden />
              )}
              {status === "dirty" && (
                <Clock className="h-4 w-4" aria-hidden />
              )}
              {status === "syncing" && (
                <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {status === "local" && (
                <HardDrive className="h-4 w-4" aria-hidden />
              )}
          </button>

          <span
            role="tooltip"
            className={`pointer-events-none absolute left-1/2 top-full z-20 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 dark:bg-zinc-100 dark:text-zinc-900 ${
              syncTipOpen ? "opacity-100" : "group-hover:opacity-100"
            }`}
          >
            {statusMeta[status].title}
          </span>
        </div>

        {editOpen ? (
          <form onSubmit={handleEdit} className="flex min-w-0 flex-1 items-center gap-2">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              aria-label={`Nombre de la lista ${list.name}`}
              className="w-full rounded-lg border border-zinc-300 bg-surface px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:border-zinc-700"
            />
            <button
              type="submit"
              aria-label="Guardar nombre"
              title="Guardar"
              className="shrink-0 rounded-lg p-2 text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
            >
              <Check className="h-5 w-5" aria-hidden />
            </button>
          </form>
        ) : (
          <Link href={`/lista/${list.id}`} className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">{list.name}</p>
              {isShared && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMembersOpen(true);
                  }}
                  aria-label={`Ver con quién se compartió ${list.name}`}
                  className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Compartida
                </button>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {list.items.length} elemento{list.items.length === 1 ? "" : "s"}{" "}
              · {completed} completado{completed === 1 ? "" : "s"}
            </p>
            {list.items.length > 0 && (
              <div
                className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={list.items.length}
                aria-valuenow={completed}
                aria-label={`${completed} de ${list.items.length} completados`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </Link>
        )}

        {isOwner && !isReadOnly && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Opciones de ${list.name}`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="rounded-lg p-2 text-text-secondary hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800"
            >
              <EllipsisVertical className="h-5 w-5" aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-surface p-1 shadow-lg dark:border-zinc-700"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setEditName(list.name);
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                  Renombrar
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShareOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800"
                >
                  <Share className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                  Compartir
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    cloneList(list.id);
                    setFlashSelf(true);
                    setTimeout(() => setFlashSelf(false), 700);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-zinc-800"
                >
                  <Copy className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                  Duplicar
                </button>

                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isOwner && !isReadOnly && shareOpen && (
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-700">
          <AddMemberForm listId={list.id} onClose={() => setShareOpen(false)} />
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Eliminar lista"
        message={`¿Seguro que querés eliminar la lista "${list.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          setDeleteOpen(false);
          deleteList(list.id);
        }}
      />

      {membersOpen && (
        <MembersDialog
          list={list}
          onClose={() => setMembersOpen(false)}
          setListSharedMembers={setListSharedMembers}
        />
      )}
    </li>
  );
}

function MembersDialog({
  list,
  onClose,
  setListSharedMembers,
}: {
  list: List;
  onClose: () => void;
  setListSharedMembers: (listId: string, members: { userId: string; email: string }[]) => void;
}) {
  const [loading, setLoading] = useState(
    !list.sharedMembers || list.sharedMembers.length === 0
  );
  const [error, setError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Se captura al montar si ya había emails resueltos; si no, se fetchean
  // on-demand al abrir el modal (no en el montaje inicial de la home, que era
  // frágil). Vivir en una ref evita re-ejecutar el effect cuando el fetch
  // actualiza los members del store.
  const alreadyLoadedRef = useRef(
    !!(list.sharedMembers && list.sharedMembers.length > 0)
  );

  useEffect(() => {
    closeRef.current?.focus();

    if (alreadyLoadedRef.current) return;

    let cancelled = false;
    getSharedMemberEmails()
      .then((shared) => {
        if (cancelled) return;
        const members = shared
          .filter((s) => s.listId === list.id)
          .map((s) => ({ userId: s.userId, email: s.email }));
        setListSharedMembers(list.id, members);
        setLoading(false);
        setError(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError(true);
      });

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", handleKey);
    };
  }, [list.id, onClose, setListSharedMembers]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="members-title"
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-zinc-200 bg-background p-5 shadow-xl dark:border-zinc-700">
        <div className="flex items-start justify-between gap-2">
          <h2
            id="members-title"
            className="flex items-center gap-2 text-base font-semibold"
          >
            <Users className="h-4 w-4 text-text-secondary" aria-hidden />
            Compartida
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mb-3 mt-1 text-xs text-text-secondary">
          {list.name}
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-text-secondary">
            <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            Cargando miembros...
          </div>
        ) : error ? (
          <div className="py-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              No pudimos cargar los miembros. Intentalo de nuevo.
            </p>
            <button
              type="button"
              onClick={() => {
                setError(false);
                setLoading(true);
                getSharedMemberEmails()
                  .then((shared) => {
                    const members = shared
                      .filter((s) => s.listId === list.id)
                      .map((s) => ({ userId: s.userId, email: s.email }));
                    setListSharedMembers(list.id, members);
                    setLoading(false);
                    setError(false);
                  })
                  .catch(() => {
                    setLoading(false);
                    setError(true);
                  });
              }}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.sharedMembers && list.sharedMembers.length > 0 ? (
              list.sharedMembers.map((m) => (
                <li
                  key={m.userId}
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  {m.email}
                </li>
              ))
            ) : (
              <li className="py-2 text-sm text-text-secondary">
                Esta lista no tiene miembros compartidos.
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
