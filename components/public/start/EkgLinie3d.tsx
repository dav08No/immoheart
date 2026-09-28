"use client"

import { useEffect, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import {
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  Vector3,
} from "three"
import { EKG_PUNKTE, EKG_Y } from "./stadtDaten"
import type { StadtFarben } from "./useStadtFarben"

const HOEHE = 0.03
const GESCHWINDIGKEIT = 4.5
// Der Ausschlag liegt flach auf dem Boden (nicht senkrecht), sonst taucht er unter die Bodenplatte.
const AUSSCHLAG = 0.7

// EKG am Boden: eine blasse Grundlinie und darüber ein Korallen-Abschnitt, der
// wandert. Der "Strich" ist ein einziges Dash; three kennt keinen dashOffset, darum
// werden die Linien-Distanzen (7 Werte) je Frame verschoben.
export function EkgLinie3d({ farben }: { farben: StadtFarben }) {
  const { grund, puls, basis, periode } = useMemo(() => {
    const punkte = EKG_PUNKTE.map(([x, z]) => new Vector3(x, HOEHE, EKG_Y - z * AUSSCHLAG))
    const geometrie = new BufferGeometry().setFromPoints(punkte)
    // Laufende Distanz ab dem ersten Punkt (wie Line.computeLineDistances).
    const basis: number[] = []
    let laenge = 0
    punkte.forEach((punkt, i) => {
      laenge += punkt.distanceTo(punkte[i - 1] ?? punkt)
      basis.push(laenge)
    })
    const strich = laenge * 0.3
    const grund = new Line(geometrie, new LineBasicMaterial({ transparent: true, opacity: 0.25 }))
    const puls = new Line(geometrie, new LineDashedMaterial({ dashSize: strich, gapSize: laenge }))
    geometrie.setAttribute("lineDistance", new Float32BufferAttribute(basis, 1))
    return { grund, puls, basis, periode: strich + laenge }
  }, [])

  useEffect(() => {
    ;(grund.material as LineBasicMaterial).color.set(farben.hell)
    ;(puls.material as LineDashedMaterial).color.set(farben.herz)
  }, [farben, grund, puls])

  // Geometrie und Materialien gehören nicht zum R3F-Baum: selbst aufräumen.
  useEffect(
    () => () => {
      grund.geometry.dispose()
      ;(grund.material as LineBasicMaterial).dispose()
      ;(puls.material as LineDashedMaterial).dispose()
    },
    [grund, puls]
  )

  useFrame((state) => {
    const distanzen = puls.geometry.getAttribute("lineDistance")
    // Distanzen verkleinern schiebt den sichtbaren Strich in Linienrichtung vorwärts.
    const versatz = (state.clock.elapsedTime * GESCHWINDIGKEIT) % periode
    basis.forEach((wert, i) => distanzen.setX(i, wert - versatz))
    distanzen.needsUpdate = true
  })

  return (
    <>
      <primitive object={grund} />
      <primitive object={puls} />
    </>
  )
}
