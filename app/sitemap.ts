import type { MetadataRoute } from "next"
import { oeffentlicheBasisUrl } from "@/lib/basis-url"
import { holeOeffentlicheObjektIds } from "@/lib/queries/oeffentlich-ohne-sitzung"

// Stündliche Regenerierung reicht: neue Objekte müssen nicht sofort in der
// Sitemap stehen, Crawler respektieren ohnehin ihr eigenes Intervall.
export const revalidate = 3600

const STATISCHE_PFADE = ["/", "/objekte", "/suchauftrag", "/inserieren", "/impressum", "/datenschutz"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const basis = oeffentlicheBasisUrl(process.env)
  const statisch = STATISCHE_PFADE.map((pfad) => ({ url: `${basis}${pfad}` }))

  // Bei einem DB-Fehler soll die Sitemap trotzdem ausgeliefert werden (nur ohne
  // Objekte), statt Crawlern einen 500er zu zeigen.
  try {
    const objekte = await holeOeffentlicheObjektIds()
    const dynamisch = objekte.map((o) => ({
      url: `${basis}/objekte/${o.id}`,
      lastModified: new Date(o.created_at),
    }))
    return [...statisch, ...dynamisch]
  } catch (fehler) {
    console.error("Sitemap: Objekte konnten nicht geladen werden", fehler)
    return statisch
  }
}
