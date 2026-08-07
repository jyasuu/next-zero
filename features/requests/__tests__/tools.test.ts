import { describe, it, expect, beforeEach, vi } from "vitest"
import { requestsTools } from "@/features/requests/tools"
import { useRequestsStore } from "@/features/requests/store"
import type { RequestRow } from "@/features/requests/lib/visibility"

const createTool = requestsTools.find((t) => t.id === "requests_create")!

const ROW: RequestRow = {
  id: "1",
  requester_email: "admin@localhost",
  title: "Prod access",
  access: "prod-cluster",
  justification: "On-call rotation",
  status: "pending",
  decided_by: null,
  decision_comment: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  decided_at: null,
}

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  useRequestsStore.setState({ rows: [], loading: false, forbidden: false })
})

describe("requests_create write-back", () => {
  it("upserts the created row into the page store on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ROW })
    const result = await createTool.execute({ title: "Prod access", access: "prod-cluster", justification: "On-call rotation" })
    expect(result.ok).toBe(true)
    expect(useRequestsStore.getState().rows).toContainEqual(ROW)
  })

  it("does not touch the store when the create is refused with 403", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Forbidden" }) })
    const result = await createTool.execute({ title: "Prod access", access: "prod-cluster", justification: "On-call rotation" })
    expect(result.ok).toBe(false)
    expect(useRequestsStore.getState().rows).toEqual([])
  })
})
