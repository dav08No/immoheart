import { Panel } from "@/components/ui/Panel"

// Alter Name, bleibt für bestehende Aufrufer; ohne Polster, weil Card nie eines hatte.
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Panel polster={false} className={className}>
      {children}
    </Panel>
  )
}
