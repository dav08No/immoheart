import { describe, expect, it } from "vitest"
import { basisUrl, bestaetigungsLink, oeffentlicheBasisUrl } from "./basis-url"

describe("basisUrl", () => {
  it("übernimmt erlaubte Hosts", () => {
    expect(basisUrl("immoheart.vercel.app", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart-git-feature-n2-konten-davides-projects-e3ca110b.vercel.app", "https")).toBe(
      "https://immoheart-git-feature-n2-konten-davides-projects-e3ca110b.vercel.app"
    )
    expect(basisUrl("localhost:3000", "http")).toBe("http://localhost:3000")
  })

  it("fällt bei fremden oder fehlenden Hosts auf Production zurück", () => {
    expect(basisUrl("evil.example.com", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart.vercel.app.evil.com", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl("immoheart-x-other-team.vercel.app", "https")).toBe("https://immoheart.vercel.app")
    expect(basisUrl(null, null)).toBe("https://immoheart.vercel.app")
  })

  it("erzwingt https ausser für localhost", () => {
    expect(basisUrl("immoheart.vercel.app", "http")).toBe("https://immoheart.vercel.app")
  })
})

describe("bestaetigungsLink", () => {
  it("baut den Link mit kodiertem Token", () => {
    expect(bestaetigungsLink("https://immoheart.vercel.app", "a b&c", "invite")).toBe(
      "https://immoheart.vercel.app/auth/bestaetigen?token_hash=a%20b%26c&typ=invite"
    )
  })
})

describe("oeffentlicheBasisUrl", () => {
  it("nutzt in Production die Produktions-URL", () => {
    expect(
      oeffentlicheBasisUrl({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "immoheart.vercel.app" })
    ).toBe("https://immoheart.vercel.app")
  })

  it("fällt in Production ohne VERCEL_PROJECT_PRODUCTION_URL auf die Konstante zurück", () => {
    expect(oeffentlicheBasisUrl({ VERCEL_ENV: "production" })).toBe("https://immoheart.vercel.app")
  })

  it("nutzt auf Preview-Deployments VERCEL_URL", () => {
    expect(oeffentlicheBasisUrl({ VERCEL_ENV: "preview", VERCEL_URL: "immoheart-abc123.vercel.app" })).toBe(
      "https://immoheart-abc123.vercel.app"
    )
  })

  it("fällt lokal ohne Vercel-Umgebung auf localhost zurück", () => {
    expect(oeffentlicheBasisUrl({})).toBe("http://localhost:3000")
  })
})
