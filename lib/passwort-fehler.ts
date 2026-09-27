// Feste, deutsche Texte statt der Supabase-Fehlermeldung: die ist Englisch
// und teils zu technisch für Endnutzer.
export function passwortFehlerText(code: string | undefined): string {
  if (code === "same_password") return "Das neue Passwort muss sich vom bisherigen unterscheiden."
  if (code === "weak_password") return "Das Passwort ist zu schwach."
  if (code === "reauthentication_needed") return "Bitte melden Sie sich erneut an und versuchen Sie es nochmals."
  return "Passwort konnte nicht gespeichert werden."
}
