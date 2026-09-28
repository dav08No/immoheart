// Ab dieser Breite (Tailwind `lg`) liegen Seitenleiste, Liste und Detail
// nebeneinander -- darunter gestapelt, dort braucht es Scroll-Sprünge.
export const LG_MEDIA = "(min-width: 1024px)"

// Reduzierte Bewegung: sofort springen statt weich scrollen.
export function scrollVerhalten(reduziert: boolean): ScrollBehavior {
  return reduziert ? "auto" : "smooth"
}

// Punkt am Menü-Knopf, damit die Badges der (auf dem Handy eingeklappten)
// Seitenleiste nicht unsichtbar werden.
export function hatMenuePunkt(postfachAnzahl: number, entwurfAnzahl: number): boolean {
  return postfachAnzahl > 0 || entwurfAnzahl > 0
}
