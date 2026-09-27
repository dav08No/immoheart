import { describe, expect, it } from "vitest"
import { basisUrl, bestaetigungsLink } from "./basis-url"

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
