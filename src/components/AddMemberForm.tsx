"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { addMemberByEmail, getSharedMemberEmails } from "@/app/supabase-actions";
import { useListStore } from "@/lib/stores/listStore";
import { useAuth } from "@/lib/supabase/auth";
import AuthGateCta from "@/components/AuthGateCta";

export default function AddMemberForm({
  listId,
  onClose,
}: {
  listId: string;
  onClose?: () => void;
}) {
  const setListSharedMembers = useListStore((s) => s.setListSharedMembers);
  const { status } = useAuth();
  const isSignedIn = status === "signedIn";
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
        <AuthGateCta compact />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await addMemberByEmail(listId, email);
      if (res.ok) {
        setResult({ ok: true, text: res.message });
        setEmail("");
        getSharedMemberEmails()
          .then((shared) => {
            const members = shared
              .filter((s) => s.listId === listId)
              .map((s) => ({ userId: s.userId, email: s.email }));
            setListSharedMembers(listId, members);
          })
          .catch(() => {});
      } else {
        setResult({ ok: false, text: res.error });
      }
    } catch {
      setResult({
        ok: false,
        text: "Hubo un error inesperado. Intentalo de nuevo.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-surface p-4 dark:border-zinc-700">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">Compartir lista</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-1 text-text-secondary hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-text-secondary">
        Ingresá el email de la persona. Le llegará una invitación para ver y
        editar esta lista, sin necesidad de que ya tenga cuenta.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="share-email" className="sr-only">
          Email de la persona
        </label>
        <input
          id="share-email"
          type="email"
          required
          placeholder="email@otrapersona.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Agregando..." : "Agregar miembro"}
        </button>
      </form>
      {result && (
        <p
          className={`mt-2 text-sm ${
            result.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {result.text}
        </p>
      )}
    </div>
  );
}
