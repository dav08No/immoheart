// Reine Aggregation über Storage-Buckets (Supabase Storage) für die Admin-Kennzahlenseite.

export function speicherAnteil(
  buckets: { bucket: string; bytes: number }[],
  grenzeBytes = 1_073_741_824
): { belegt: number; anteil: number; nachBucket: { bucket: string; bytes: number }[] } {
  const belegt = buckets.reduce((s, b) => s + b.bytes, 0)
  const anteil = grenzeBytes > 0 ? belegt / grenzeBytes : 0
  // Grösster Verbraucher zuerst -- Admins lesen die Tabelle ohne selbst zu sortieren.
  const nachBucket = [...buckets].sort((a, b) => b.bytes - a.bytes)
  return { belegt, anteil, nachBucket }
}

const EINHEITEN = ["B", "KB", "MB", "GB", "TB"] as const

export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`
  let wert = n
  let index = 0
  while (wert >= 1024 && index < EINHEITEN.length - 1) {
    wert /= 1024
    index++
  }
  // 3 signifikante Stellen -- bei kleinen Werten mehr Nachkommastellen, sonst wirkt
  // z.B. "1 GB" ungenauer als "1.02 GB".
  const nachkommastellen = wert < 10 ? 2 : wert < 100 ? 1 : 0
  return `${wert.toFixed(nachkommastellen)} ${EINHEITEN[index] ?? "B"}`
}
