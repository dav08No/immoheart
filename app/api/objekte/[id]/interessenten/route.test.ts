import { beforeEach, describe, expect, it, vi } from "vitest"

const getUser = vi.fn()
const holeInteressenten = vi.fn()

vi.mock("@/lib/supabase/server", () => ({
  erstelleServerClient: async () => ({ auth: { getUser } }),
}))
vi.mock("@/lib/queries/interessenten", () => ({ holeInteressenten: (id: string) => holeInteressenten(id) }))

import { GET } from "./route"

const ID = "22222222-2222-2222-2222-222222222201"
const aufruf = (id: string) => GET(new Request("http://x"), { params: Promise.resolve({ id }) })

describe("GET /api/objekte/[id]/interessenten", () => {
  beforeEach(() => {
    getUser.mockReset()
    holeInteressenten.mockReset()
  })

  it("antwortet ohne Sitzung mit 401 und fragt keine Daten ab", async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    const res = await aufruf(ID)
    expect(res.status).toBe(401)
    expect(holeInteressenten).not.toHaveBeenCalled()
  })

  it("liefert mit Sitzung die Interessenten", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    holeInteressenten.mockResolvedValue({ objektStatus: "verfuegbar", interessenten: [], fehlendeEntwuerfe: 0 })
    const res = await aufruf(ID)
    expect(res.status).toBe(200)
    expect(holeInteressenten).toHaveBeenCalledWith(ID)
  })
})
