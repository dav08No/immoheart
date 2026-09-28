"use server"

// Neutrale Action für alle öffentlichen Formulare: holt ein frisches Zeit-Token, wenn
// das beim Rendern erzeugte fehlt oder abgelaufen ist (siehe useWebsiteFormular).
import { erstelleZeitToken } from "@/lib/formular-schutz"
import { formularGeheimnis } from "@/lib/formular-geheimnis"

export async function zeitTokenHolen(): Promise<string> {
  return erstelleZeitToken(Date.now(), formularGeheimnis())
}
