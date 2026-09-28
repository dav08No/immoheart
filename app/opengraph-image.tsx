import { ImageResponse } from "next/og"

// Standard-OG-Bild für alle Seiten ohne eigenes Bild. Objekt-Detailseiten
// überschreiben es mit ihrem Titelbild (siehe generateMetadata dort, N5).
// Kein externer Font-Fetch nötig -- satori nutzt sonst seine Systemschrift,
// das bleibt robust unabhängig von Build/Edge-Umgebung.
export const alt = "immoheart – Gewerbeflächen mit Herzschlag"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          background: "linear-gradient(135deg, #065A82 0%, #21295C 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="#E24B5B">
            <path d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
          </svg>
          <span style={{ fontSize: 76, fontWeight: 700, color: "#FFFFFF" }}>immoheart</span>
        </div>
        <span style={{ fontSize: 34, fontWeight: 500, color: "#FFFFFF" }}>Gewerbeflächen mit Herzschlag</span>
        <span style={{ fontSize: 26, color: "#EAF2F7" }}>Region Solothurn</span>
      </div>
    ),
    { ...size }
  )
}
