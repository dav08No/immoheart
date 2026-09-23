import path from "node:path"
import { defineConfig, configDefaults } from "vitest/config"

export default defineConfig({
  resolve: {
    // Spiegelt tsconfig.json's "@/*": ["./*"] -- ohne diesen Alias funktioniert
    // ein `@/`-Import in einem Test nur zufällig, solange er ausschliesslich
    // `import type` ist (das wird beim Build entfernt); der erste echte
    // Wert-Import über `@/` würde sonst mit einem verwirrenden
    // "Failed to load url @/..." fehlschlagen.
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    // .worktrees enthält einen vollständigen Checkout des aktiven Feature-Branches
    // (siehe .gitignore) — ohne diesen Ausschluss findet Vitest jede Testdatei doppelt.
    exclude: [...configDefaults.exclude, ".worktrees/**"],
  },
})
