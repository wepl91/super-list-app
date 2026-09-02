import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      // Cobertura medida sobre la lógica pura + la app (decisión del dueño).
      // Se excluyen capas con dependencias de runtime no testables en jsdom:
      // supabase (client/server/auth), sync (realtime/service), el store que
      // dispara server actions (listStore), el service worker y los bundle-only.
      include: [
        "src/lib/haptics.ts",
        "src/lib/loginPrompt.ts",
        "src/lib/useHydrated.ts",
        "src/lib/theme.tsx",
        "src/lib/useScreenWakeLock.ts",
        "src/lib/stores/preferencesStore.ts",
        "src/components/ConfirmDialog.tsx",
        "src/components/AuthGateCta.tsx",
        "src/components/ThemeToggle.tsx",
        "src/components/InstallPrompt.tsx",
        "src/components/ListOptionsMenu.tsx",
        "src/components/ScreenKeepAwake.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});