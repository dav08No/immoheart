import { describe, expect, it } from "vitest"
import { ohneArchivierteObjekte } from "./anfragen"

describe("ohneArchivierteObjekte", () => {
  it("lässt Treffer archivierter Objekte weg und behält die übrigen", () => {
    const treffer = [
      { objekt_id: "o1", anfrage_id: "a1" },
      { objekt_id: "o2", anfrage_id: "a1" },
      { objekt_id: "o3", anfrage_id: "a2" },
    ]
    expect(ohneArchivierteObjekte(treffer, new Set(["o2"])).map((t) => t.objekt_id)).toEqual(["o1", "o3"])
  })

  it("ändert nichts ohne archivierte Objekte", () => {
    expect(ohneArchivierteObjekte([{ objekt_id: "o1" }], new Set())).toEqual([{ objekt_id: "o1" }])
  })
})
