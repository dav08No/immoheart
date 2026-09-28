// Zeit-Token beim Rendern einer Formularseite (Server Component). Fehlt das Geheimnis,
// soll die Seite trotzdem erscheinen: leeres Token -> das Formular holt beim Laden
// über zeitTokenHolen (app/actions/formular.ts) ein neues nach.
import "server-only"
import { erstelleZeitToken } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"

export function zeitTokenOderLeer(protokoll: string): string {
  try {
    return erstelleZeitToken(Date.now(), formularGeheimnis())
  } catch (fehler) {
    console.error(`${protokoll}: Zeit-Token fehlgeschlagen`, fehler)
    return ""
  }
}
