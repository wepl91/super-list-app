"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpDown,
  EllipsisVertical,
  Eye,
  EyeOff,
  Trash2,
  Users,
} from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";

interface ListOptionsMenuProps {
  onSort: () => void;
  onDeleteCompleted: () => void;
  hasCompleted: boolean;
  hideCompleted: boolean;
  onToggleHideCompleted: () => void;
  onShare?: () => void;
  canShare?: boolean;
}

export default function ListOptionsMenu({
  onSort,
  onDeleteCompleted,
  hasCompleted,
  hideCompleted,
  onToggleHideCompleted,
  onShare,
  canShare = false,
}: ListOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
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
        className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <EllipsisVertical className="h-5 w-5" aria-hidden />
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
              <Users className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
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
            <ArrowUpDown className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
            Ordenar alfabéticamente
          </button>

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={hideCompleted}
            onClick={() => {
              onToggleHideCompleted();
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {hideCompleted ? (
              <EyeOff className={`h-4 w-4 shrink-0 ${hideCompleted ? "text-primary" : "text-text-secondary"}`} aria-hidden />
            ) : (
              <Eye className={`h-4 w-4 shrink-0 ${hideCompleted ? "text-primary" : "text-text-secondary"}`} aria-hidden />
            )}
            {hideCompleted
              ? "Mostrar elementos tachados"
              : "Ocultar elementos tachados"}
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={!hasCompleted}
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
            Eliminar completados
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar completados"
        message="¿Seguro que querés eliminar todos los elementos tachados de esta lista? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onDeleteCompleted();
        }}
      />
    </div>
  );
}
