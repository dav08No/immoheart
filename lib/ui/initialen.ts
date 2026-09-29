// Initialen für Avatar-Kreise (Seitenleiste, Nutzerliste); filter(Boolean) fängt
// doppelte Leerzeichen und leere Namen ab.
export function initialen(name: string): string {
  return (
    name
      .split(" ")
      .map((teil) => teil[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  )
}
