// Geheimnis für Zeit-Token und IP-Hash der öffentlichen Formulare: keine eigene
// Umgebungsvariable, sondern eine feste HMAC-Ableitung aus dem ohnehin nur
// serverseitig bekannten Service-Role-Key. Der Kontext trennt sie kryptografisch
// von anderen Verwendungen desselben Keys ("server-only" verhindert den Import aus
// einer Server Action, die auch im Client-Bundle landen könnte).
import "server-only"
import { createHmac } from "node:crypto"

const KONTEXT = "immoheart-formular-v1"

export function formularGeheimnis(): string {
  const schluessel = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!schluessel) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt")
  return createHmac("sha256", schluessel).update(KONTEXT).digest("hex")
}
