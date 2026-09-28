import Link from "next/link"
import { LogIn } from "lucide-react"
import { HerzLogo } from "./HerzLogo"
import { HauptNavigation } from "./HauptNavigation"
import { MobilMenue } from "./MobilMenue"
import { GlasHeader } from "./GlasHeader"
import { ThemeUmschalter } from "@/components/theme/ThemeUmschalter"

export function SiteHeader() {
  return (
    <GlasHeader>
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label="immoheart Startseite">
          <HerzLogo />
        </Link>
        <HauptNavigation className="hidden flex-1 md:flex" />
        <span className="flex-1 md:hidden" />
        <ThemeUmschalter />
        <Link
          href="/login"
          className="hidden items-center gap-1.5 rounded-lg border border-line-2 px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2 md:inline-flex"
        >
          <LogIn className="size-4" aria-hidden />
          Login
        </Link>
        <MobilMenue />
      </div>
    </GlasHeader>
  )
}
