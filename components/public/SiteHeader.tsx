import Link from "next/link"
import { LogIn } from "lucide-react"
import { HerzLogo } from "./HerzLogo"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-surface/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" aria-label="immoheart Startseite">
          <HerzLogo />
        </Link>
        <span className="flex-1" />
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          <LogIn className="size-4" aria-hidden />
          Login
        </Link>
      </div>
    </header>
  )
}
