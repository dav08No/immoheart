// Führt fn genau einmal aus: beim ersten ausloesen() oder spätestens nach wartezeitMs.
// Grund: Aufräumarbeiten nach einem Dialog (Panel schliessen, Seite neu laden) sollen erst
// laufen, wenn der Dialog weg ist -- aber auch dann, wenn sein Ende-Ereignis ausbleibt.
export function nachlaufPlanen(fn: () => void, wartezeitMs: number): () => void {
  let erledigt = false
  const zeitgeber = setTimeout(ausloesen, wartezeitMs)
  function ausloesen() {
    if (erledigt) return
    erledigt = true
    clearTimeout(zeitgeber)
    fn()
  }
  return ausloesen
}
