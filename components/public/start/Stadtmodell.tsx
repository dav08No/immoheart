"use client"

import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { FehlerGrenze } from "./FehlerGrenze"
import { StadtFallback } from "./StadtFallback"
import { useDarf3d } from "./useDarf3d"

// Lazy-Chunk mit three/fiber: wird nur geladen, wenn useDarf3d() es erlaubt.
const StadtSzene = dynamic(() => import("./StadtSzene"), { ssr: false, loading: () => null })

// Zuerst immer das statische SVG (auch im Server-HTML); die WebGL-Szene liegt
// deckungsgleich darüber und blendet erst ein, wenn ihr erster Frame steht.
export function Stadtmodell() {
  const darf = useDarf3d()
  const [bereit, setBereit] = useState(false)
  const [fehler, setFehler] = useState(false)
  const szeneAktiv = darf && !fehler
  const szeneSichtbar = szeneAktiv && bereit

  const beiBereit = useCallback(() => setBereit(true), [])
  const beiFehler = useCallback(() => setFehler(true), [])

  return (
    <div className="relative size-full">
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          szeneSichtbar ? "opacity-0" : "opacity-100"
        )}
      >
        <StadtFallback />
      </div>
      {szeneAktiv && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            szeneSichtbar ? "opacity-100" : "opacity-0"
          )}
        >
          <FehlerGrenze onFehler={beiFehler}>
            <StadtSzene onBereit={beiBereit} onFehler={beiFehler} />
          </FehlerGrenze>
        </div>
      )}
    </div>
  )
}
