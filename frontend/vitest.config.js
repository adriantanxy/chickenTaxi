import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // jsdom gives the pure helpers a `window`/`localStorage`/`document` to use
    // (firstRun, ThemeProvider's applyTheme path). The logic under test is still
    // plain functions — no React rendering needed.
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    globals: true,
  },
});
