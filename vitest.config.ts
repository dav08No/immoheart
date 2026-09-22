import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    // .worktrees enthält einen vollständigen Checkout des aktiven Feature-Branches
    // (siehe .gitignore) — ohne diesen Ausschluss findet Vitest jede Testdatei doppelt.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
      ".worktrees/**",
    ],
  },
})
