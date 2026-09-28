import { StatusChip } from "@/components/ui/StatusChip"

// Alter Name mit `kind`, bleibt für bestehende Aufrufer; intern dieselbe Pille wie StatusChip.
type Props = { kind?: "neutral" | "gut" | "warn" | "kritisch"; children: React.ReactNode }

export function Chip({ kind = "neutral", children }: Props) {
  return <StatusChip ton={kind}>{children}</StatusChip>
}
