"use client"

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg p-5 text-center">
      <h1 className="font-display text-lg font-bold text-ink">Etwas ist schiefgelaufen</h1>
      <p className="max-w-sm text-sm text-ink-2">
        Die Seite konnte nicht geladen werden. Das kann an einer instabilen Verbindung liegen oder daran, dass Ihr
        Profil nicht korrekt eingerichtet ist — wenden Sie sich in letzterem Fall an eine Administratorin.
      </p>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
        >
          Erneut versuchen
        </button>
        <a href="/login" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-on-brand hover:bg-brand-2">
          Zur Anmeldung
        </a>
      </div>
    </main>
  )
}
