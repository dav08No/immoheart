import { Label } from "@/components/shadcn/label"

type Props = {
  id: string
  label: string
  wert: string
  fehler?: string
  onWechsel: (wert: string) => void
  optionen: { wert: string; label: string }[]
  platzhalter: string
}

// Pflicht-Auswahl mit Fehler direkt darunter (gleiche aria-Verknüpfung wie AnfrageFeld).
export function AuswahlFeld({ id, label, wert, fehler, onWechsel, optionen, platzhalter }: Props) {
  const fehlerId = `${id}-fehler`
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-ink">{label}</Label>
      <select
        id={id}
        name={id}
        value={wert}
        required
        aria-invalid={fehler ? true : undefined}
        aria-describedby={fehler ? fehlerId : undefined}
        onChange={(e) => onWechsel(e.target.value)}
        className="h-9 w-full min-w-0 rounded-md border border-line-2 bg-surface px-3 text-base text-ink outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
      >
        <option value="" disabled>{platzhalter}</option>
        {optionen.map((option) => (
          <option key={option.wert} value={option.wert}>{option.label}</option>
        ))}
      </select>
      {fehler && (
        <p id={fehlerId} className="text-sm text-crit">{fehler}</p>
      )}
    </div>
  )
}
