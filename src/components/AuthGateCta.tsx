"use client";

import { openLoginModal } from "@/lib/loginPrompt";

/**
 * CTA reutilizable para el bloqueo de escritura sin sesión (RF-6 / D4).
 * Muestra un aviso en español y un botón que abre el modal de inicio de sesión
 * de UserMenu. No gatea la lectura.
 */
export default function AuthGateCta({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-zinc-300 bg-surface text-center dark:border-zinc-700 ${
        compact ? "p-2 text-xs" : "p-4"
      }`}
    >
      <p className="text-sm text-text-secondary">
        Ingresá para poder crear y editar tus listas.
      </p>
      <button
        type="button"
        onClick={openLoginModal}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Iniciar sesión
      </button>
    </div>
  );
}
