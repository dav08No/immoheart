import { Seitenkopf, SEITEN_INHALT_KLASSE } from "@/components/layout/Seitenkopf"
import { ArchivAnsicht } from "@/components/archiv/ArchivAnsicht"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { holeArchiv } from "@/lib/queries/archiv-seite"
import { kontextArchiv } from "@/lib/admin/kontext"

// Kein try/catch: Ladefehler fängt app/admin/error.tsx (Error-Boundary des Segments).
export default async function ArchivPage() {
  // Parallel: holeArchiv läuft mit RLS, ohne Sitzung leitet holeEigenesProfil ohnehin weiter.
  const [profil, daten] = await Promise.all([holeEigenesProfil(), holeArchiv()])
  // Ein Stichtag für "letzte 12 Monate", gesetzt auf dem Server (hydrationssicher).
  const jetzt = new Date().toISOString()

  return (
    <>
      <Seitenkopf
        titel="Archiv"
        kontext={kontextArchiv(daten.treffer.length, daten.objekte.length, daten.anfragen.length)}
      />
      <main className={SEITEN_INHALT_KLASSE}>
        {/* Knopf-Sichtbarkeit nur als Komfort; die Löschrechte prüfen Action und DB. */}
        <ArchivAnsicht daten={daten} istAdmin={profil.darf_nutzer_anlegen} jetzt={jetzt} />
      </main>
    </>
  )
}
