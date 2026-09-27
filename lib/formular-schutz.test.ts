import { describe, expect, it } from "vitest"
import {
  MINDESTZEIT_MS,
  clientIp,
  erstelleZeitToken,
  hashIp,
  pruefeZeitToken,
  stundenFenster,
} from "./formular-schutz"

const GEHEIMNIS = "test-geheimnis"

describe("erstelleZeitToken / pruefeZeitToken", () => {
  it("ist gültig nach 3,1 s", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start + 3100, GEHEIMNIS)).toBe("ok")
  })

  it("ist zu schnell bei 2,9 s", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start + 2900, GEHEIMNIS)).toBe("zu_schnell")
  })

  it("ist gültig genau an der Mindestzeit", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start + MINDESTZEIT_MS, GEHEIMNIS)).toBe("ok")
  })

  it("erkennt eine manipulierte Zeit", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    const [, signatur] = token.split(".")
    const manipuliert = `${start - 10000}.${signatur}`
    expect(pruefeZeitToken(manipuliert, start + 3100, GEHEIMNIS)).toBe("ungueltig")
  })

  it("erkennt eine manipulierte Signatur", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    const [ms] = token.split(".")
    expect(pruefeZeitToken(`${ms}.deadbeef`, start + 3100, GEHEIMNIS)).toBe("ungueltig")
  })

  it("lehnt ein falsches Geheimnis ab", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start + 3100, "anderes-geheimnis")).toBe("ungueltig")
  })

  it("lehnt ein Token älter als 24 h ab", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start + 24 * 60 * 60 * 1000 + 1, GEHEIMNIS)).toBe("ungueltig")
  })

  it("lehnt ein Token aus der Zukunft ab", () => {
    const start = 1_000_000
    const token = erstelleZeitToken(start, GEHEIMNIS)
    expect(pruefeZeitToken(token, start - 1, GEHEIMNIS)).toBe("ungueltig")
  })

  it("lehnt ein unlesbares Token ab", () => {
    expect(pruefeZeitToken("kaputt", 1_000_000, GEHEIMNIS)).toBe("ungueltig")
    expect(pruefeZeitToken("abc.def", 1_000_000, GEHEIMNIS)).toBe("ungueltig")
  })
})

describe("hashIp", () => {
  it("ist deterministisch", () => {
    expect(hashIp("1.2.3.4", GEHEIMNIS)).toBe(hashIp("1.2.3.4", GEHEIMNIS))
  })

  it("hängt vom Geheimnis ab", () => {
    expect(hashIp("1.2.3.4", GEHEIMNIS)).not.toBe(hashIp("1.2.3.4", "anderes"))
  })

  it("hängt von der IP ab", () => {
    expect(hashIp("1.2.3.4", GEHEIMNIS)).not.toBe(hashIp("5.6.7.8", GEHEIMNIS))
  })
})

describe("stundenFenster", () => {
  it("rundet auf die volle Stunde (UTC)", () => {
    expect(stundenFenster(Date.parse("2026-09-27T08:45:12.000Z"))).toBe("2026-09-27T08:00:00.000Z")
  })

  it("liefert dasselbe Fenster innerhalb derselben Stunde", () => {
    const a = stundenFenster(Date.parse("2026-09-27T08:01:00.000Z"))
    const b = stundenFenster(Date.parse("2026-09-27T08:59:59.000Z"))
    expect(a).toBe(b)
  })

  it("liefert ein anderes Fenster in der nächsten Stunde", () => {
    const a = stundenFenster(Date.parse("2026-09-27T08:59:59.000Z"))
    const b = stundenFenster(Date.parse("2026-09-27T09:00:00.000Z"))
    expect(a).not.toBe(b)
  })
})

describe("clientIp", () => {
  function kopf(werte: Record<string, string | null>) {
    return { get: (name: string) => werte[name] ?? null }
  }

  it("nimmt die erste Adresse aus x-forwarded-for, auch mit Leerzeichen", () => {
    expect(clientIp(kopf({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" }))).toBe("1.2.3.4")
  })

  it("fällt auf x-real-ip zurück", () => {
    expect(clientIp(kopf({ "x-forwarded-for": null, "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9")
  })

  it("liefert unbekannt ohne jeden Header", () => {
    expect(clientIp(kopf({}))).toBe("unbekannt")
  })
})
