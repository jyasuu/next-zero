import { describe, it, expect, beforeEach, vi } from "vitest"
import { createListStore } from "@/stores/list-store"

interface Row {
  id: string
  name: string
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

function makeStore() {
  return createListStore<Row>({ fetchUrl: "/api/rows" })
}

describe("createListStore", () => {
  it("starts with an empty list, loading, and no forbidden flag", () => {
    const store = makeStore()
    expect(store.getState().rows).toEqual([])
    expect(store.getState().loading).toBe(true)
    expect(store.getState().forbidden).toBe(false)
  })

  it("load sets the rows from the list endpoint and clears loading", async () => {
    const rows = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Grace" },
    ]
    fetchMock.mockResolvedValue({ status: 200, ok: true, json: async () => rows })
    const store = makeStore()
    await store.getState().load()
    expect(store.getState().rows).toEqual(rows)
    expect(store.getState().loading).toBe(false)
    expect(store.getState().forbidden).toBe(false)
  })

  it("load maps a 403 to the forbidden flag and clears loading", async () => {
    fetchMock.mockResolvedValue({ status: 403, ok: false, json: async () => ({ error: "Forbidden" }) })
    const store = makeStore()
    await store.getState().load()
    expect(store.getState().forbidden).toBe(true)
    expect(store.getState().loading).toBe(false)
    expect(store.getState().rows).toEqual([])
  })

  it("upsert adds a new row to the front", () => {
    const store = makeStore()
    store.getState().upsert({ id: "a", name: "A" })
    store.getState().upsert({ id: "b", name: "B" })
    expect(store.getState().rows.map((r) => r.id)).toEqual(["b", "a"])
  })

  it("upsert replaces an existing row by id instead of duplicating it", () => {
    const store = makeStore()
    store.getState().upsert({ id: "a", name: "A" })
    store.getState().upsert({ id: "b", name: "B" })
    store.getState().upsert({ id: "a", name: "A renamed" })
    expect(store.getState().rows).toHaveLength(2)
    expect(store.getState().rows.find((r) => r.id === "a")?.name).toBe("A renamed")
    expect(store.getState().rows.find((r) => r.id === "a")?.id).toBe("a")
  })
})
