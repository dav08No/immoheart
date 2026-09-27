// Reine "soll jetzt laufen?"-Logik für MailAbrufer, getrennt von Timer/DOM/Server
// Actions -- so ohne Rendering und ohne echte Zeitabläufe testbar (siehe .test.ts).
export function sollJetztAbrufen(input: { letzterLauf: number; jetzt: number; sichtbar: boolean; intervallMs: number }): boolean {
  if (!input.sichtbar) return false
  return input.jetzt - input.letzterLauf >= input.intervallMs
}
