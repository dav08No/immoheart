import { Seitenkopf } from "./Seitenkopf"

// Übergang: Seiten, die noch Header nutzen, bekommen schon den neuen Seitenkopf.
// Wird entfernt, sobald alle Seiten direkt Seitenkopf verwenden.
export function Header({ titel, untertitel }: { titel: string; untertitel?: string }) {
  return <Seitenkopf titel={titel} kontext={untertitel} />
}
