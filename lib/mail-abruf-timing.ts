// Reine "soll jetzt laufen?"-Logik für MailAbrufer, getrennt von Timer/DOM/Server
// Actions -- so ohne Rendering und ohne echte Zeitabläufe testbar (siehe .test.ts).
export function sollJetztAbrufen(input: { letzterLauf: number; jetzt: number; sichtbar: boolean; intervallMs: number }): boolean {
  if (!input.sichtbar) return false
  return input.jetzt - input.letzterLauf >= input.intervallMs
}

// Ein Takt des Hintergrund-Pollers: letzterLauf wird beim START gesetzt (sonst verschiebt
// die Rundendauer jeden zweiten Takt, Final-Review I1) und zurückgesetzt, wenn die Runde
// gar nicht lief (runde() liefert false, z.B. weil PostfachKopfs Runde gerade läuft) --
// dann versucht es schon der nächste Takt erneut.
export function erstelleAbrufTakt(opts: {
  intervallMs: number
  jetzt: () => number
  sichtbar: () => boolean
  runde: () => Promise<boolean>
}): () => Promise<void> {
  let letzterLauf = 0
  return async () => {
    const start = opts.jetzt()
    if (!sollJetztAbrufen({ letzterLauf, jetzt: start, sichtbar: opts.sichtbar(), intervallMs: opts.intervallMs })) return
    const vorher = letzterLauf
    letzterLauf = start
    if (!(await opts.runde())) letzterLauf = vorher
  }
}
