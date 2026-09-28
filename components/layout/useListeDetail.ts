"use client"

import { useCallback, useRef } from "react"
import { LG_MEDIA, scrollVerhalten } from "@/lib/mobil-ansicht"

function scrolleZu(ziel: HTMLElement | null) {
  // Ab lg stehen Liste und Detail nebeneinander -- dort nie springen.
  if (!ziel || window.matchMedia(LG_MEDIA).matches) return
  const reduziert = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ziel.scrollIntoView({ behavior: scrollVerhalten(reduziert), block: "start" })
}

// Postfach/Entwürfe unter lg: Liste und Detail stehen untereinander; nach einer
// Auswahl springt die Ansicht zum Detail, "Zurück zur Liste" wieder hinauf.
export function useListeDetail() {
  const listeRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const zumDetail = useCallback(() => scrolleZu(detailRef.current), [])
  const zurListe = useCallback(() => scrolleZu(listeRef.current), [])
  return { listeRef, detailRef, zumDetail, zurListe }
}
