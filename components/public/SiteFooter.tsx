import { HerzLogo } from "./HerzLogo"

const MAIL = "immoheart.business@gmail.com"

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-2 sm:flex-row sm:items-center">
        <HerzLogo className="text-base" />
        <span className="text-ink-3">ein Angebot von espaceSOLOTHURN</span>
        <span className="flex-1" />
        <a href={`mailto:${MAIL}`} className="hover:text-brand">{MAIL}</a>
      </div>
    </footer>
  )
}
