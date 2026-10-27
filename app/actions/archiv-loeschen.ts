"use server"

// Endgültiges Löschen archivierter Daten (Spec §1). Getrennt von archiv.ts, weil hier
// zusätzlich das Admin-Recht gilt; die DB-Funktionen prüfen es ein zweites Mal.
import { revalidatePath } from "next/cache"
import { holeEigenesProfil } from "@/lib/queries/profile"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import {
  entferneFotoDateien,
  loescheAnfrageEndgueltig,
  loescheArchivEintrag,
  loescheObjektEndgueltig,
} from "@/lib/queries/archiv"
import { idSchema, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

type LoeschErgebnis = Ergebnis & { hinweise?: string[] }

const NUR_ADMIN = "Nur Administratoren dürfen endgültig löschen."
const FOTO_HINWEIS = "Fotos konnten nicht vollständig gelöscht werden."

function pruefeId(id: unknown): string {
  const geprueft = idSchema.safeParse(id)
  if (!geprueft.success) throw new NutzerFehler("Ungültige ID.")
  return geprueft.data
}

// Admin-Recht vor allem anderen (ohne Sitzung leitet holeEigenesProfil weiter);
// das Flag direkt prüfen statt einen Fehlertext zu vergleichen.
async function alsAdmin(schritt: () => Promise<LoeschErgebnis>): Promise<LoeschErgebnis> {
  const profil = await holeEigenesProfil()
  if (!profil.darf_nutzer_anlegen) return { fehler: NUR_ADMIN }
  try {
    const ergebnis = await schritt()
    revalidatePath("/admin/archiv")
    revalidatePath("/admin")
    revalidatePath("/admin", "layout")
    return ergebnis
  } catch (e) {
    if (e instanceof NutzerFehler) return { fehler: e.message }
    throw e
  }
}

export async function archivEintragLoeschen(eintragId: string): Promise<LoeschErgebnis> {
  return alsAdmin(async () => {
    await loescheArchivEintrag(pruefeId(eintragId))
    return { fehler: null }
  })
}

export async function objektEndgueltigLoeschen(objektId: string): Promise<LoeschErgebnis> {
  return alsAdmin(async () => {
    const pfade = await loescheObjektEndgueltig(pruefeId(objektId))
    // Erst nach dem Commit der DB-Funktion: scheitert der Storage, ist nur Speicher verwaist.
    if (await entferneFotoDateien(pfade)) return { fehler: null }
    return { fehler: null, hinweise: [FOTO_HINWEIS] }
  })
}

export async function anfrageEndgueltigLoeschen(anfrageId: string): Promise<LoeschErgebnis> {
  return alsAdmin(async () => {
    await loescheAnfrageEndgueltig(pruefeId(anfrageId))
    return { fehler: null }
  })
}
