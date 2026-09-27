import { describe, expect, it } from "vitest"
import { abrufSeit, ersatzMessageId, waehleZuImportieren } from "./auswahl"

const k = (uid: number, messageId: string) => ({ uid, messageId })

describe("waehleZuImportieren", () => {
  it("nimmt unbekannte Mails, älteste zuerst, höchstens max", () => {
    const ergebnis = waehleZuImportieren([k(9, "<c>"), k(3, "<a>"), k(5, "<b>")], new Map(), 2)
    expect(ergebnis.map((x) => x.uid)).toEqual([3, 5])
  })

  it("überspringt vollständig bekannte Mails, auch bereits gesendete", () => {
    const bekannt = new Map([
      ["<a>", { id: "1", richtung: "eingang", ki_status: "fertig" }],
      ["<b>", { id: "2", richtung: "gesendet", ki_status: null }],
    ])
    const ergebnis = waehleZuImportieren([k(1, "<a>"), k(2, "<b>"), k(3, "<c>")], bekannt, 5)
    expect(ergebnis.map((x) => x.uid)).toEqual([3])
  })

  it("nimmt einen abgebrochenen Import erneut", () => {
    const bekannt = new Map([["<a>", { id: "1", richtung: "eingang", ki_status: null }]])
    expect(waehleZuImportieren([k(1, "<a>")], bekannt, 5)).toEqual([k(1, "<a>")])
  })
})

describe("ersatzMessageId / abrufSeit", () => {
  it("bildet eine stabile Ersatz-ID aus UIDVALIDITY und UID", () => {
    expect(ersatzMessageId("42", 7)).toBe("<imap-42-7@immoheart.local>")
  })

  it("liegt drei Tage zurück", () => {
    expect(abrufSeit(Date.UTC(2026, 8, 27)).toISOString()).toBe("2026-09-24T00:00:00.000Z")
  })
})
