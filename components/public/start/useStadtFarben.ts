"use client"

import { useEffect, useState } from "react"

export type StadtFarben = {
  bau: string
  bau2: string
  herz: string
  hell: string
}

// Hellmodus-Werte der Website-Tokens aus app/globals.css (.website), falls eine
// Variable (noch) fehlt.
const STANDARD: StadtFarben = {
  bau: "#4A4541",
  bau2: "#5E5853",
  herz: "#FF1C38",
  hell: "#FFFFFF",
}

function lesen(): StadtFarben {
  // Die Website-Farben hängen am .website-Wrapper, nicht an <html> (dort liegen
  // die Admin-Tokens).
  const quelle = document.querySelector(".website") ?? document.documentElement
  const stil = getComputedStyle(quelle)
  const wert = (name: string, ersatz: string) => stil.getPropertyValue(name).trim() || ersatz
  return {
    bau: wert("--stadt-a", STANDARD.bau),
    bau2: wert("--stadt-b", STANDARD.bau2),
    herz: wert("--heart", STANDARD.herz),
    hell: wert("--on-hero", STANDARD.hell),
  }
}

// WebGL kennt keine CSS-Variablen: Farben aus den Tokens lesen und beim
// Theme-Wechsel (data-theme auf <html>, siehe ThemeUmschalter) neu lesen.
export function useStadtFarben(): StadtFarben {
  const [farben, setFarben] = useState<StadtFarben>(STANDARD)

  useEffect(() => {
    setFarben(lesen())
    const beobachter = new MutationObserver(() => setFarben(lesen()))
    beobachter.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => beobachter.disconnect()
  }, [])

  return farben
}
