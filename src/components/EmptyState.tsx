"use client";

import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Ícono ilustrativo (opcional, se muestra centrado arriba). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Acción opcional (ej. un botón o CTA). */
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-surface px-6 py-10 text-center dark:border-zinc-700 ${className ?? ""}`}
    >
      {icon && (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-xs text-sm text-text-secondary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}