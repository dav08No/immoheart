// Event-Name als Konstante: fuehreAbrufRundeAus (Dispatcher) und Sidebar (Listener)
// müssen exakt denselben String verwenden -- ein Tippfehler würde sonst still keine
// Wirkung zeigen, keine Fehlermeldung.
export const NEUE_MAILS_EREIGNIS = "immoheart:neue-mails"

export type NeueMailsDetail = { neu: number }

// Dispatcht ein DOM-Ereignis statt eines React-Kontexts: MailAbrufer und PostfachKopf
// (die beiden Aufrufer von fuehreAbrufRundeAus) liegen an ganz unterschiedlichen Stellen
// im Baum, ein Kontext müsste beide UND die Sidebar umschliessen. `window` ist hier der
// einzige gemeinsame Vorfahre. Kein `any`: CustomEvent ist generisch über das Detail.
export function meldeNeueMails(neu: number): void {
  if (typeof window === "undefined" || neu <= 0) return
  window.dispatchEvent(new CustomEvent<NeueMailsDetail>(NEUE_MAILS_EREIGNIS, { detail: { neu } }))
}

// Reine Entscheidung, getrennt vom Dispatch/Listener, damit sie ohne DOM testbar ist.
// Toast nur ausserhalb des Postfachs: dort zeigt der Herzschlag im Badge/Logo dasselbe
// Ereignis schon sichtbar an, ein zusätzlicher Toast wäre doppelt gemoppelt.
export function zeigeMailToast(pfad: string): boolean {
  return pfad !== "/admin/postfach" && !pfad.startsWith("/admin/postfach/")
}
