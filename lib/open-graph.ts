// Gemeinsame Open-Graph-Angaben. Next ersetzt openGraph eines tieferen Segments
// komplett (kein Zusammenführen) -- wer openGraph selbst setzt, muss diese Basis und
// ein Bild mitgeben, sonst fehlen siteName/locale und das Standard-OG-Bild.
export const OPEN_GRAPH_BASIS = { siteName: "immoheart", locale: "de_CH", type: "website" } as const

// Route des generierten Standardbilds (app/opengraph-image.tsx).
export const STANDARD_OG_BILD = "/opengraph-image"
