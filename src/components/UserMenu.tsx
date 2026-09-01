"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/supabase/auth";
import { useHydrated } from "@/lib/useHydrated";

export default function UserMenu() {
  const {
    status,
    user,
    error,
    signUp,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  } = useAuth();
  const hydrated = useHydrated();

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
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

  function initials(): string {
    const name = user?.user_metadata?.full_name ?? user?.email ?? "?";
    const parts =
      typeof name === "string" ? name.trim().split(/\s+/) : [];
    const first = parts[0]?.[0] ?? "?";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      await signInWithEmail(email, password);
    } else {
      await signUp(email, password);
    }
    setBusy(false);
  }

  function openModal() {
    setModalOpen(true);
    setEmail("");
    setPassword("");
    setMode("login");
  }

  const isSignedIn = status === "signedIn" && user;

  if (!hydrated) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => (isSignedIn ? setOpen((v) => !v) : openModal())}
        aria-label={isSignedIn ? "Opciones de cuenta" : "Iniciar sesión"}
        aria-expanded={isSignedIn ? open : undefined}
        className="relative h-9 w-9 overflow-hidden rounded-full bg-primary text-sm font-semibold text-white shadow-sm hover:opacity-90"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={user?.email ?? "Avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {initials()}
          </span>
        )}
      </button>

      {isSignedIn && open && (
        <div
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-xl border border-zinc-200 bg-surface p-1 shadow-lg dark:border-zinc-700"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">
              {user.user_metadata?.full_name ?? user.email}
            </p>
            {user.email && user.user_metadata?.full_name && (
              <p className="truncate text-xs text-text-secondary">
                {user.email}
              </p>
            )}
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-700" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              signOut();
              setOpen(false);
            }}
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
                d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 1 1.5 0v1.5A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M19 10a.75.75 0 0 1-.75.75H11.56l1.72 1.72a.75.75 0 1 1-1.06 1.06l-3-3a.75.75 0 0 1 0-1.06l3-3a.75.75 0 0 1 1.06 1.06l-1.72 1.72h6.69A.75.75 0 0 1 19 10Z"
                clipRule="evenodd"
              />
            </svg>
            Cerrar sesión
          </button>
        </div>
      )}

      {modalOpen && !isSignedIn && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setModalOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Iniciar sesión o registrarse"
            className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-surface p-5 shadow-xl dark:border-zinc-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  mode === "login"
                    ? "bg-primary text-white"
                    : "border border-zinc-300 dark:border-zinc-700"
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  mode === "register"
                    ? "bg-primary text-white"
                    : "border border-zinc-300 dark:border-zinc-700"
                }`}
              >
                Registrarse
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <label htmlFor="user-menu-email" className="sr-only">
                Email
              </label>
              <input
                id="user-menu-email"
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
              />
              <label htmlFor="user-menu-password" className="sr-only">
                Contraseña
              </label>
              <input
                id="user-menu-password"
                type="password"
                required
                minLength={6}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-placeholder dark:border-zinc-700"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy
                  ? "Procesando..."
                  : mode === "login"
                    ? "Iniciar sesión"
                    : "Crear cuenta"}
              </button>
            </form>

            <button
              type="button"
              onClick={signInWithGoogle}
              className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Continuar con Google
            </button>

            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {mode === "register" && (
              <p className="mt-2 text-xs text-text-secondary">
                Crearás una cuenta con ese email y contraseña.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
