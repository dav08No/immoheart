const TITEL = "Gewerbeflächen mit Herzschlag."
const WOERTER = TITEL.split(" ")

// Wortweises Einblenden per CSS-Keyframes statt motion: so steht der Titel im
// Server-HTML, erscheint auch ohne JS und kostet kein Client-Bundle. Bei reduzierter
// Bewegung schaltet globals.css die Animation ab -- alles sofort sichtbar.
export function HeroText() {
  return (
    <div className="flex flex-col gap-5">
      <h1 id="hero-titel" className="font-display text-4xl leading-[1.08] font-bold text-on-hero sm:text-6xl">
        {/* Screenreader lesen den Satz am Stück, nicht Wort für Wort. */}
        <span className="sr-only">{TITEL}</span>
        <span aria-hidden>
          {WOERTER.map((wort, i) => (
            <span key={`${wort}-${i}`}>
              <span
                // Koralle als Unterstrich statt Schriftfarbe: Koralle auf Petrol hätte zu wenig Kontrast.
                className={`inline-block animate-wort-ein ${wort.startsWith("Herzschlag") ? "underline decoration-heart decoration-4 underline-offset-8" : ""}`}
                style={{ animationDelay: `${120 + i * 110}ms` }}
              >
                {wort}
              </span>
              {i < WOERTER.length - 1 && " "}
            </span>
          ))}
        </span>
      </h1>
      <p
        className="max-w-xl animate-wort-ein text-lg text-on-hero-2 sm:text-xl"
        style={{ animationDelay: `${120 + WOERTER.length * 110}ms` }}
      >
        Büro, Gewerbe, Produktion und Lager in der Region Solothurn — persönlich vermittelt, schnell beantwortet.
      </p>
    </div>
  )
}
