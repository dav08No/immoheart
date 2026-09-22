import { defineConfig, configDefaults } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // .worktrees enthält einen vollständigen Checkout des aktiven Feature-Branches
    // (siehe .gitignore) — ohne diesen Ausschluss findet Vitest jede Testdatei doppelt.
    exclude: [...configDefaults.exclude, ".worktrees/**"],
  },
})
