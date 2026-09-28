"use client"

import { useEffect, useRef, useState } from "react"
import { Canvas } from "@react-three/fiber"
import { StadtBauten } from "./StadtBauten"
import { useStadtFarben } from "./useStadtFarben"

type Props = {
  /** Erster Frame steht: jetzt darf über den Fallback geblendet werden. */
  onBereit: () => void
  /** WebGL-Kontext verloren: zurück zum Fallback. */
  onFehler: () => void
}

// Nur über next/dynamic({ ssr: false }) aus Stadtmodell geladen, damit `three`
// in einem eigenen Chunk landet und keine andere Route es mitlädt.
export default function StadtSzene({ onBereit, onFehler }: Props) {
  const huelle = useRef<HTMLDivElement>(null)
  const farben = useStadtFarben()
  const [imBild, setImBild] = useState(true)
  const [tabSichtbar, setTabSichtbar] = useState(true)

  // Nicht rendern, wenn niemand hinschaut: spart Akku und GPU.
  useEffect(() => {
    const element = huelle.current
    if (!element) return
    const beobachter = new IntersectionObserver(([eintrag]) => setImBild(eintrag?.isIntersecting ?? true))
    beobachter.observe(element)
    const sichtbarkeit = () => setTabSichtbar(!document.hidden)
    sichtbarkeit()
    document.addEventListener("visibilitychange", sichtbarkeit)
    return () => {
      beobachter.disconnect()
      document.removeEventListener("visibilitychange", sichtbarkeit)
    }
  }, [])

  return (
    <div ref={huelle} className="size-full">
      <Canvas
        frameloop={imBild && tabSichtbar ? "always" : "never"}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        camera={{ position: [13, 11, 13], fov: 36 }}
        onCreated={({ gl, camera }) => {
          camera.lookAt(0, 1.6, 0)
          gl.domElement.addEventListener("webglcontextlost", onFehler, { once: true })
          requestAnimationFrame(() => onBereit())
        }}
      >
        <ambientLight intensity={1.1} color={farben.hell} />
        <directionalLight position={[6, 12, 8]} intensity={2.2} color={farben.hell} />
        <directionalLight position={[-8, 4, -6]} intensity={0.5} color={farben.brand2} />
        <StadtBauten farben={farben} />
      </Canvas>
    </div>
  )
}
