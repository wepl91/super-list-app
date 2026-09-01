"use client";

import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
      className="rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-foreground transition-colors"
    >
      {theme === "dark" ? (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2Zm0 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm6.25-5.25a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5ZM10 16.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-6.25-7.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5Zm13.5 0a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1 0-1.5h1.5ZM6.63 4.21a.75.75 0 0 1 .06 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06-.06Zm9.87 9.87a.75.75 0 0 1 .06 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06-.06Zm-11.46 0 1.06 1.06a.75.75 0 1 1-1.06 1.06L4.17 15.13a.75.75 0 0 1 1.06-1.06ZM14.97 4.21l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 1.06-.06ZM10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M10.894 2.553a1 1 0 0 0-1.788 0l-1.75 3.546-3.91.568a1 1 0 0 0-.555 1.706l2.829 2.757-.668 3.893a1 1 0 0 0 1.451 1.054L10 14.348l3.497 1.839a1 1 0 0 0 1.451-1.054l-.668-3.893 2.829-2.757a1 1 0 0 0-.555-1.706l-3.91-.568-1.75-3.546Z" />
        </svg>
      )}
    </button>
  );
}
