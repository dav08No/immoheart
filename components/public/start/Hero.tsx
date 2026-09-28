import { HeroText } from "./HeroText"
import { HeroVisual } from "./HeroVisual"
import { PulsKnopf } from "./PulsKnopf"

export function Hero() {
  return (
    <section
      aria-labelledby="hero-titel"
      className="overflow-hidden bg-gradient-to-br from-hero-von to-hero-bis"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:pb-20">
        <div className="flex flex-col gap-8">
          <HeroText />
          <div className="flex flex-wrap gap-4">
            <PulsKnopf href="/objekte" ton="herz" hauptsache>
              Objekte ansehen
            </PulsKnopf>
            <PulsKnopf href="/suchauftrag" ton="petrol">
              Suchauftrag erteilen
            </PulsKnopf>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  )
}
