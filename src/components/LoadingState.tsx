"use client";

interface LoadingStateProps {
  /** Qué pantalla imita el skeleton: el home (lista de cards) o el detalle. */
  variant?: "home" | "detail";
}

const cardRows = 3;

function HomeSkeleton() {
  return (
    <div className="animate-fade-in" role="status" aria-live="polite">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Mis listas
      </p>
      <div className="flex flex-col gap-2">
        {Array.from({ length: cardRows }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700"
          >
            <div className="skeleton h-4 w-3/5" />
            <div className="skeleton mt-2 h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-fade-in space-y-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-6 w-56" />
        </div>
        <div className="skeleton h-9 w-9 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-10 flex-1" />
        <div className="skeleton h-10 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-surface p-3 dark:border-zinc-700"
          >
            <div className="skeleton h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton de carga que imita el layout real en vez de mostrar texto. */
export default function LoadingState({
  variant = "home",
}: LoadingStateProps) {
  return variant === "detail" ? <DetailSkeleton /> : <HomeSkeleton />;
}
