"use client"

import { useLayoutEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Color, MathUtils, Object3D, type Group, type InstancedMesh, type MeshStandardMaterial } from "three"
import { herzschlagSkala } from "./herzschlag"
import { EkgLinie3d } from "./EkgLinie3d"
import { BAUTEN } from "./stadtDaten"
import type { StadtFarben } from "./useStadtFarben"

const PETROL = BAUTEN.filter((bau) => !bau.herz)
const HERZ = BAUTEN.find((bau) => bau.herz) ?? { x: 3, y: 2.5, b: 2, t: 2, h: 4.5 }
// Rastermitte, damit sich die Gruppe um ihr Zentrum dreht.
const MITTE_X = 4.25
const MITTE_Z = 4.15
const DREHUNG_PRO_S = 0.12

export function StadtBauten({ farben }: { farben: StadtFarben }) {
  const neigung = useRef<Group>(null)
  const drehung = useRef<Group>(null)
  const petrol = useRef<InstancedMesh>(null)
  const herzBau = useRef<Group>(null)
  const herzMaterial = useRef<MeshStandardMaterial>(null)
  const hilfe = useMemo(() => new Object3D(), [])

  // Ein InstancedMesh für alle Petrol-Bauten: ein Draw-Call statt acht.
  useLayoutEffect(() => {
    const mesh = petrol.current
    if (!mesh) return
    PETROL.forEach(({ x, y, b, t, h }, i) => {
      hilfe.position.set(x + b / 2, h / 2, y + t / 2)
      hilfe.scale.set(b, h, t)
      hilfe.updateMatrix()
      mesh.setMatrixAt(i, hilfe.matrix)
      mesh.setColorAt(i, new Color(i % 2 === 0 ? farben.brand : farben.brand2))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [farben, hilfe])

  useFrame((state, delta) => {
    // Nach einer Pause (Tab verborgen) kein Sprung: delta begrenzen.
    const dt = Math.min(delta, 0.1)
    if (drehung.current) drehung.current.rotation.y += dt * DREHUNG_PRO_S
    if (neigung.current) {
      // Gedämpfte Neigung zur Maus hin, nur ein paar Grad.
      const ziel = neigung.current.rotation
      ziel.x = MathUtils.damp(ziel.x, -state.pointer.y * 0.12, 3, dt)
      ziel.z = MathUtils.damp(ziel.z, state.pointer.x * 0.08, 3, dt)
    }
    const schlag = herzschlagSkala(state.clock.elapsedTime)
    // Halbe Amplitude der CSS-Skalierung: ein ganzes Gebäude wirkt sonst zu unruhig.
    herzBau.current?.scale.setScalar(1 + (schlag - 1) * 0.5)
    if (herzMaterial.current) herzMaterial.current.emissiveIntensity = 0.15 + (schlag - 1) * 3
  })

  return (
    <group ref={neigung}>
      <group ref={drehung}>
        <group position={[-MITTE_X, 0, -MITTE_Z]}>
          <mesh rotation-x={-Math.PI / 2} position={[MITTE_X, 0, MITTE_Z]}>
            <planeGeometry args={[10.5, 10]} />
            <meshBasicMaterial color={farben.hell} transparent opacity={0.06} depthWrite={false} />
          </mesh>
          <instancedMesh ref={petrol} args={[undefined, undefined, PETROL.length]}>
            <boxGeometry />
            <meshStandardMaterial roughness={0.7} metalness={0.05} />
          </instancedMesh>
          {/* Skaliert vom Fusspunkt aus, damit das Gebäude nicht im Boden versinkt. */}
          <group ref={herzBau} position={[HERZ.x + HERZ.b / 2, 0, HERZ.y + HERZ.t / 2]}>
            <mesh position-y={HERZ.h / 2}>
              <boxGeometry args={[HERZ.b, HERZ.h, HERZ.t]} />
              <meshStandardMaterial
                ref={herzMaterial}
                color={farben.herz}
                emissive={farben.herz}
                emissiveIntensity={0.15}
                roughness={0.5}
              />
            </mesh>
          </group>
          <EkgLinie3d farben={farben} />
        </group>
      </group>
    </group>
  )
}
