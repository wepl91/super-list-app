"use client";

import { useEffect, useRef, useState } from "react";

interface ListOptionsMenuProps {
  onSort: () => void;
  onDeleteCompleted: () => void;
  hasCompleted: boolean;
  onShare?: () => void;
  canShare?: boolean;
}

export default function ListOptionsMenu({
  onSort,
  onDeleteCompleted,
  hasCompleted,
  onShare,
  canShare = false,
}: ListOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handlePointer(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Opciones de la lista"
        aria-expanded={open}
        aria-haspopup="menu"
        className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-foreground"
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

      {open && (
        <div
          role="menu"
          aria-labelledby="list-options"
          className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-surface p-1 shadow-lg dark:border-zinc-700"
        >
          {canShare && onShare && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onShare();
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0 text-text-secondary"
                aria-hidden="true"
              >
                <path d="M13 4.5a2.5 2.5 0 1 1 .7 1.77L8.99 9.22a2.5 2.5 0 0 1 0 1.56l4.71 2.95a2.5 2.5 0 1 1-.7 1.77l-4.71-2.95a2.5 2.5 0 1 1-3.58-2.92L6.1 10l-1.39 1.37a2.5 2.5 0 1 1 3.58 2.92l4.71 2.95a2.5 2.5 0 1 1 3.5 3.26V14.5c0-.65.25-1.24.66-1.68l-5.06-3.16L15.66 6.5H16v4.12a2.5 2.5 0 0 1 2 2.38V14a2.5 2.5 0 1 1-4 0v-.62a2.5 2.5 0 0 1 .66-1.68l-5.06-3.16Z" />
              </svg>
              Compartir lista
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSort();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 shrink-0 text-text-secondary"
              aria-hidden="true"
            >
              <path d="M3 3a1 1 0 0 0 0 2h11a1 1 0 1 0 0-2H3Zm0 4a1 1 0 0 0 0 2h7a1 1 0 1 0 0-2H3Zm0 4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2H3Zm12-3a1 1 0 1 0-2 0v5.586l-1.293-1.293a1 1 0 1 0-1.414 1.414l3 3a1 1 0 0 0 1.414 0l3-3a1 1 0 1 0-1.414-1.414L15 13.586V8Z" />
            </svg>
            Ordenar alfabéticamente
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!hasCompleted}
            onClick={() => {
              onDeleteCompleted();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950 dark:hover:text-red-400"
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
            Eliminar completados
          </button>
        </div>
      )}
    </div>
  );
}
