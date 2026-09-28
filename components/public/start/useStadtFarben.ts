"use client"

import { useEffect, useState } from "react"

export type StadtFarben = {
  brand: string
  brand2: string
  navy: string
  herz: string
  hell: string
}

// Hellmodus-Werte aus app/globals.css, falls eine Variable (noch) fehlt.
const STANDARD: StadtFarben = {
  brand: "#065A82",
  brand2: "#1C7293",
  navy: "#21295C",
  herz: "#E24B5B",
  hell: "#FFFFFF",
}

function lesen(): StadtFarben {
  const stil = getComputedStyle(document.documentElement)
  const wert = (name: string, ersatz: string) => stil.getPropertyValue(name).trim() || ersatz
  return {
    brand: wert("--brand", STANDARD.brand),
    brand2: wert("--brand-2", STANDARD.brand2),
    navy: wert("--navy", STANDARD.navy),
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
