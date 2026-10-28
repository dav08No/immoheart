import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nachlaufPlanen } from "./nachlauf"

describe("nachlaufPlanen", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it("läuft nicht sofort, sondern erst beim Auslösen", () => {
    const fn = vi.fn()
    const ausloesen = nachlaufPlanen(fn, 400)
    expect(fn).not.toHaveBeenCalled()
    ausloesen()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("läuft spätestens nach der Wartezeit, wenn das Ende-Ereignis ausbleibt", () => {
    const fn = vi.fn()
    nachlaufPlanen(fn, 400)
    vi.advanceTimersByTime(399)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("läuft genau einmal, auch bei Auslösen, Zeitlimit und Unmount zusammen", () => {
    const fn = vi.fn()
    const ausloesen = nachlaufPlanen(fn, 400)
    ausloesen()
    ausloesen()
    vi.advanceTimersByTime(1000)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("Zeitlimit zuerst, späteres Auslösen bleibt wirkungslos", () => {
    const fn = vi.fn()
    const ausloesen = nachlaufPlanen(fn, 400)
    vi.advanceTimersByTime(400)
    ausloesen()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
