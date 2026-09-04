"use client";

interface ProgressSummaryProps {
  total: number;
  completed: number;
}

export default function ProgressSummary({ total, completed }: ProgressSummaryProps) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm">
        <p className="text-text-secondary">
          {completed} de {total} completado{completed === 1 ? "" : "s"}
        </p>
        <span
          className={`text-sm font-medium ${
            pct === 100 ? "text-primary" : "text-text-secondary"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-label={`${completed} de ${total} completados`}
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}