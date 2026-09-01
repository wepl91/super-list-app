"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { List } from "@/lib/types";
import { useListStore } from "@/lib/stores/listStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AddMemberForm from "@/components/AddMemberForm";

interface ListCardProps {
  list: List;
  isOwner?: boolean;
  /** Modo solo lectura (sin sesión): oculta las acciones de escritura. */
  isReadOnly?: boolean;
}

export default function ListCard({
  list,
  isOwner = true,
  isReadOnly = false,
}: ListCardProps) {
  const cloneList = useListStore((s) => s.cloneList);
  const deleteList = useListStore((s) => s.deleteList);
  const renameList = useListStore((s) => s.renameList);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [syncTipOpen, setSyncTipOpen] = useState(false);
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

  function handleDelete() {
    setMenuOpen(false);
    const ok = window.confirm(
      `¿Seguro que quieres eliminar la lista "${list.name}"? Esta acción no se puede deshacer.`
    );
    if (ok) deleteList(list.id);
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
      className={`rounded-xl border border-zinc-200 bg-surface shadow-sm dark:border-zinc-700 ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        {isOwner && !isReadOnly && (
          <button
            type="button"
            aria-label={`Reordenar ${list.name}`}
            className="cursor-grab touch-none rounded p-1 text-text-secondary hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM6 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM6 12a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm8 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
            </svg>
          </button>
        )}

        <div ref={statusRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSyncTipOpen((v) => !v)}
            aria-label={statusMeta[status].title}
            aria-haspopup="true"
            aria-expanded={syncTipOpen}
            className={`group rounded p-0.5 ${statusMeta[status].cls}`}
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              {status === "synced" && (
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-8.7a.75.75 0 0 0-1.4-.6l-2.55 4.04-1.77-1.42a.75.75 0 1 0-.92 1.18l2.42 1.94a.75.75 0 0 0 1.14-.17l3.08-4.97Z"
                  clipRule="evenodd"
                />
              )}
              {status === "dirty" && (
                <path
                  fillRule="evenodd"
                  d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm.75 4.25a.75.75 0 0 0-1.5 0V10c0 .2.08.39.22.53l2 2a.75.75 0 1 0 1.06-1.06l-1.78-1.78V6.25Z"
                  clipRule="evenodd"
                />
              )}
              {status === "syncing" && (
                <path d="M10 2a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 10 2Zm0 12.5a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 1 .75-.75Zm7.25-4.5a.75.75 0 0 1-.75.75h-2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75ZM4.75 8a.75.75 0 0 1-.75.75H2a.75.75 0 0 1 0-1.5h2a.75.75 0 0 1 .75.75Zm.53-3.72a.75.75 0 0 1 0 1.06l-1.414 1.414a.75.75 0 0 1-1.06-1.06L4.22 4.22a.75.75 0 0 1 1.06 0Zm9.19 9.19a.75.75 0 0 1 0 1.06l-1.414 1.414a.75.75 0 0 1-1.06-1.06l1.414-1.414a.75.75 0 0 1 1.06 0Zm1.06-9.19a.75.75 0 0 1 1.06 0l1.414 1.414a.75.75 0 1 1-1.06 1.06L15.78 4.22a.75.75 0 0 1 0-1.06Zm-1.06 1.06a.75.75 0 0 1 0 1.06L14.22 6.69a.75.75 0 0 1-1.06-1.06l1.414-1.414a.75.75 0 0 1 1.06 0Z" />
              )}
              {status === "local" && (
                <path d="M5.4 7.6A4 4 0 0 1 9.5 4.06a4.5 4.5 0 0 1 4.82 2.36A3.5 3.5 0 0 1 17 9.5c0 .55-.12 1.06-.35 1.52a.75.75 0 1 1-1.33-.7c.1-.19.18-.48.18-.82a2 2 0 0 0-2-2h-.3a.75.75 0 0 1-.72-.96 2.99 2.99 0 0 0-2.42-3.72A2.5 2.5 0 0 0 6.65 5.4a.75.75 0 0 1-.9.33 1.5 1.5 0 0 0-1.93 1.44c0 .36.12.69.33.96a.75.75 0 0 1-1.24.85A3 3 0 0 1 5.4 7.6Zm3.6 7.9a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM2.47 13.06a.75.75 0 0 1 1.06 0l1.06 1.06 1.06-1.06a.75.75 0 1 1 1.06 1.06L5.65 15.18l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06-1.06-1.06a.75.75 0 0 1 0-1.06Z" />
              )}
            </svg>
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
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3.5 2.75A1.75 1.75 0 0 1 5.25 1h6.5c.46 0 .9.18 1.23.51l2.51 2.51c.33.33.51.77.51 1.23v9.5a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75v-12ZM5.25 2.5a.25.25 0 0 0-.25.25v3a.25.25 0 0 0 .25.25h6a.25.25 0 0 0 .25-.25v-3a.25.25 0 0 0-.25-.25h-6Zm7.5 1.06v2.94a1.75 1.75 0 0 1-1.75 1.75h-4A1.75 1.75 0 0 1 5.25 6.5V3.56L4.56 4.25A.25.25 0 0 0 4.5 4.5v12a.25.25 0 0 0 .25.25h1V13.5a1 1 0 0 1 1-1h6.5a1 1 0 0 1 1 1v3.25h1a.25.25 0 0 0 .25-.25V6.87a.25.25 0 0 0-.07-.18l-2.17-2.17a.25.25 0 0 0-.18-.07h-.33Z" />
              </svg>
            </button>
          </form>
        ) : (
          <Link href={`/lista/${list.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{list.name}</p>
            <p className="text-xs text-text-secondary">
              {list.items.length} elemento{list.items.length === 1 ? "" : "s"}{" "}
              · {completed} completado{completed === 1 ? "" : "s"}
            </p>
            {isOwner && list.sharedMembers && list.sharedMembers.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-text-secondary">
                Compartida con:{" "}
                {list.sharedMembers.map((m) => m.email).join(", ")}
              </p>
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
              className="rounded-lg p-2 text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M10 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
              </svg>
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
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  >
                    <path d="m5.43 13.9 6.4-6.4 2.1 2.1-6.4 6.4H5.43v-2.1Zm9.07-7.67a.53.53 0 0 0-.76 0l-1.28 1.28 2.1 2.1 1.28-1.28a.53.53 0 0 0 0-.76l-1.34-1.34ZM4.26 16.22c-.07.1 0 .28.13.3l2.04.34 6.4-6.4-2.1-2.1-6.4 6.4-.07 2.06Z" />
                  </svg>
                  Renombrar
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShareOpen(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  >
                    <path d="M11 5.5V3.75a.75.75 0 0 0-1.28-.53L5.09 7.85a.75.75 0 0 0 0 1.06l4.63 4.63a.75.75 0 0 0 1.28-.53V11a5.5 5.5 0 0 1 5.5 5.5v.75a.75.75 0 0 0 1.5 0v-.75A7 7 0 0 0 11 12Z" />
                    <path d="M3.75 5A1.75 1.75 0 0 0 2 6.75v8.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0 0 14 15.25v-1.042a.75.75 0 0 0-1.5 0v1.042a.25.25 0 0 1-.25.25h-8.5a.25.25 0 0 1-.25-.25v-8.5a.25.25 0 0 1 .25-.25h1.042a.75.75 0 0 0 0-1.5H3.75Z" />
                  </svg>
                  Compartir
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    cloneList(list.id);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  >
                    <path d="M5 2a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h1v-1.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v.5H13V4a2 2 0 0 0-2-2H5Z" />
                    <path d="M8 6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H8Z" />
                  </svg>
                  Duplicar
                </button>

                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDelete}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4 shrink-0 text-text-secondary"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h.04l.81 9.9A2.25 2.25 0 0 0 6.09 17.5h7.82a2.25 2.25 0 0 0 2.24-2.1l.81-9.9H17a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25V4h-5v-.25ZM7 8.75a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 7 8.75Zm6 0a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 13 8.75Z"
                      clipRule="evenodd"
                    />
                  </svg>
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
    </li>
  );
}
