// Platzhalterbild für Objekte ohne Foto (Website und Admin): schlichte Gewerbebauten in Grautönen.
// Farben über Tokens (currentColor + surface-Klassen), damit es im hellen und dunklen Modus passt.
export function ObjektPlatzhalter({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={`size-full bg-surface-3 text-ink-3 ${className}`}
      aria-hidden
    >
      {/* Boden */}
      <rect x="0" y="232" width="400" height="68" fill="currentColor" fillOpacity="0.12" />

      {/* Halle links mit Sheddach und Rolltor */}
      <path d="M40 232V150l30-22v22l30-22v22l30-22v22l30-22v104z" fill="currentColor" fillOpacity="0.28" />
      <rect x="62" y="182" width="44" height="50" className="fill-surface-2" />
      {[192, 202, 212, 222].map((y) => (
        <rect key={y} x="62" y={y} width="44" height="1.5" fill="currentColor" fillOpacity="0.25" />
      ))}
      <rect x="120" y="186" width="26" height="18" className="fill-surface-2" />

      {/* Bürohaus rechts mit Fensterraster */}
      <rect x="196" y="78" width="132" height="154" fill="currentColor" fillOpacity="0.4" />
      <rect x="196" y="72" width="132" height="8" fill="currentColor" fillOpacity="0.5" />
      {[94, 122, 150, 178].map((y) =>
        [210, 240, 270, 300].map((x) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="16" height="18" className="fill-surface-2" />
        )),
      )}
      <rect x="250" y="204" width="24" height="28" className="fill-surface-2" />

      {/* Kleiner Nebenbau */}
      <rect x="328" y="168" width="40" height="64" fill="currentColor" fillOpacity="0.22" />
    </svg>
  )
}
