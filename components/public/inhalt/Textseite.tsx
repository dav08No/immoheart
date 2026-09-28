import type { ReactNode } from "react"

// Gemeinsames Layout für Text-lastige Seiten (Impressum, Datenschutz): schmale
// Spalte für gute Lesbarkeit, Titel in Fraunces wie der Rest der Website. Die
// Feinschrift (Überschriften, Absätze, Links) kommt aus der Klasse "text-inhalt"
// in app/globals.css statt aus einem Typography-Plugin.
export function Textseite({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{titel}</h1>
      <div className="text-inhalt">{children}</div>
    </div>
  )
}
