import { redirect } from "next/navigation"
import { linkTyp } from "@/lib/routen"

type Props = {
  searchParams: Promise<{ token_hash?: string; typ?: string }>
}

// Zeigt nur eine Zwischenseite mit Bestätigungs-Button, statt den Token direkt
// hier einzulösen: Mail-Scanner rufen Links aus E-Mails oft per GET vorab ab
// (Prefetch/Virenscan) und würden ein Einmal-Token sonst verbrauchen, bevor der
// Nutzer klickt. Das eigentliche Einlösen passiert erst per POST, ausgelöst
// durch den Klick auf "Weiter" (siehe app/auth/bestaetigen/einloesen/route.ts).
export default async function BestaetigenSeite({ searchParams }: Props) {
  const { token_hash: tokenHash, typ: typRoh } = await searchParams
  const typ = linkTyp(typRoh ?? null)
  if (!tokenHash || !typ) {
    redirect("/login?grund=link-ungueltig")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg">
      <form
        method="post"
        action="/auth/bestaetigen/einloesen"
        className="flex w-full max-w-sm flex-col gap-3 rounded-card border border-line bg-surface p-6"
      >
        <h1 className="font-display text-xl font-bold text-ink">immoheart</h1>
        <p className="text-sm text-ink-2">Klicken Sie auf „Weiter“, um fortzufahren.</p>
        <input type="hidden" name="token_hash" value={tokenHash} />
        <input type="hidden" name="typ" value={typ} />
        <button
          type="submit"
          className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-on-brand"
        >
          Weiter
        </button>
      </form>
    </main>
  )
}
