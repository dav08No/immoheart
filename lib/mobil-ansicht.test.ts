import { describe, expect, it } from "vitest"
import { hatMenuePunkt, scrollVerhalten } from "./mobil-ansicht"

describe("scrollVerhalten", () => {
  it("scrollt weich ohne Bewegungswunsch", () => {
    expect(scrollVerhalten(false)).toBe("smooth")
  })
  it("springt bei prefers-reduced-motion", () => {
    expect(scrollVerhalten(true)).toBe("auto")
  })
})

describe("hatMenuePunkt", () => {
  it("zeigt keinen Punkt ohne ungelesene Mails und Entwürfe", () => {
    expect(hatMenuePunkt(0, 0)).toBe(false)
  })
  it("zeigt den Punkt bei ungelesenen Mails", () => {
    expect(hatMenuePunkt(2, 0)).toBe(true)
  })
  it("zeigt den Punkt bei offenen Entwürfen", () => {
    expect(hatMenuePunkt(0, 1)).toBe(true)
  })
})
