import path from "node:path"
import { FlatCompat } from "@eslint/eslintrc"
import { includeIgnoreFile } from "@eslint/compat"

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const eslintConfig = [
  includeIgnoreFile(path.resolve(import.meta.dirname, ".gitignore")),
  {
    ignores: ["next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]

export default eslintConfig
