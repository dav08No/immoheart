type Props = { kind?: "neutral" | "gut" | "warn" | "kritisch"; children: React.ReactNode }

const STILE: Record<NonNullable<Props["kind"]>, string> = {
  neutral: "bg-surface-3 text-ink-2",
  gut: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
  kritisch: "bg-crit-bg text-crit",
}

export function Chip({ kind = "neutral", children }: Props) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${STILE[kind]}`}>
      {children}
    </span>
  )
}
