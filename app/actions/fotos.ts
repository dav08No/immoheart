"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { holeEigenesProfil } from "@/lib/queries/profile"
import {
  erstelleUploadZiel, holeFotos, kopiereAusMailAnhang, loescheFoto, registriereFoto, setzeReihenfolge,
  type Foto,
} from "@/lib/queries/fotos"
import { istFotoMime, pruefeFoto } from "@/lib/objekt-fotos"
import { NutzerFehler } from "@/lib/nutzer-fehler"
import { idSchema, type Ergebnis } from "@/app/actions/entwuerfe-hilfen"

type UploadZiel = { pfad: string; token: string }

// Obergrenze nur gegen absurd grosse Anfragen; real sind es eine Handvoll Fotos.
const idListeSchema = z.array(idSchema).max(200)

function pruefeId(wert: string): string {
  const geprueft = idSchema.safeParse(wert)
  if (!geprueft.success) throw new NutzerFehler("Ungültige Angaben.")
  return geprueft.data.toLowerCase()
}

function neuLaden() {
  revalidatePath("/admin/objekte")
  revalidatePath("/admin")
  revalidatePath("/objekte")
  revalidatePath("/objekte/[id]", "page")
}

// Erwartete Fehler als { fehler }, alles andere wirft weiter (Muster aus eingang-aktionen.ts).
async function alsErgebnis<T extends object>(
  arbeit: () => Promise<T>,
  leer: T,
): Promise<T & Ergebnis> {
  try {
    return { ...(await arbeit()), fehler: null }
  } catch (e) {
    if (e instanceof NutzerFehler) return { ...leer, fehler: e.message }
    throw e
  }
}

export async function fotosLaden(objektId: string): Promise<Ergebnis & { fotos: Foto[] }> {
  await holeEigenesProfil()
  return alsErgebnis(async () => ({ fotos: await holeFotos(pruefeId(objektId)) }), { fotos: [] })
}

// Die Datei geht direkt vom Browser in den Bucket (Server-Action-Bodies sind auf 1 MB
// begrenzt); hier wird nur geprüft und ein einmaliges Upload-Ziel vergeben.
export async function uploadVorbereiten(
  objektId: string,
  mime: string,
  groesse: number,
): Promise<Ergebnis & { ziel: UploadZiel | null }> {
  await holeEigenesProfil()
  return alsErgebnis(async () => {
    const id = pruefeId(objektId)
    const problem = pruefeFoto(mime, groesse)
    if (problem || !istFotoMime(mime)) throw new NutzerFehler(problem ?? "Ungültiges Format.")
    const { pfad, token } = await erstelleUploadZiel(id, mime)
    return { ziel: { pfad, token } as UploadZiel | null }
  }, { ziel: null })
}

export async function fotoRegistrieren(objektId: string, pfad: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  const ergebnis = await alsErgebnis(async () => {
    if (typeof pfad !== "string") throw new NutzerFehler("Ungültiger Foto-Pfad.")
    await registriereFoto(pruefeId(objektId), pfad)
    return {}
  }, {})
  if (!ergebnis.fehler) neuLaden()
  return ergebnis
}

export async function fotosSortieren(objektId: string, ids: string[]): Promise<Ergebnis> {
  await holeEigenesProfil()
  const ergebnis = await alsErgebnis(async () => {
    const geprueft = idListeSchema.safeParse(ids)
    if (!geprueft.success) throw new NutzerFehler("Ungültige Angaben.")
    await setzeReihenfolge(pruefeId(objektId), geprueft.data.map((id) => id.toLowerCase()))
    return {}
  }, {})
  if (!ergebnis.fehler) neuLaden()
  return ergebnis
}

export async function fotoLoeschen(id: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  const ergebnis = await alsErgebnis(async () => {
    await loescheFoto(pruefeId(id))
    return {}
  }, {})
  if (!ergebnis.fehler) neuLaden()
  return ergebnis
}

// Für das Postfach (Task 5): Mail-Bild serverseitig nach objekt-fotos kopieren.
export async function alsObjektfotoUebernehmen(anhangId: string, objektId: string): Promise<Ergebnis> {
  await holeEigenesProfil()
  const ergebnis = await alsErgebnis(async () => {
    await kopiereAusMailAnhang(pruefeId(anhangId), pruefeId(objektId))
    return {}
  }, {})
  if (!ergebnis.fehler) neuLaden()
  return ergebnis
}
