"use client"

import { Component, type ReactNode } from "react"

type Props = { children: ReactNode; onFehler: () => void }
type Zustand = { fehler: boolean }

// Fängt Laufzeit- und Chunk-Ladefehler der WebGL-Szene ab: statt einer
// kaputten Startseite bleibt einfach das statische Bild stehen.
export class FehlerGrenze extends Component<Props, Zustand> {
  state: Zustand = { fehler: false }

  static getDerivedStateFromError(): Zustand {
    return { fehler: true }
  }

  componentDidCatch() {
    this.props.onFehler()
  }

  render() {
    return this.state.fehler ? null : this.props.children
  }
}
