import { describe, it, expect, beforeEach, vi } from "vitest"
import { expensesTools } from "@/features/expenses/tools"
import { useExpensesStore } from "@/features/expenses/store"
import type { ExpenseRow } from "@/features/expenses/lib/visibility"

const createTool = expensesTools.find((t) => t.id === "expenses_create")!

const ROW: ExpenseRow = {
  id: "1",
  requester_email: "admin@localhost",
  title: "Team lunch",
  amount: "42.50",
  justification: "Client meeting",
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
  useExpensesStore.setState({ rows: [], loading: false, forbidden: false })
})

describe("expenses_create write-back", () => {
  it("upserts the created row into the page store on success", async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 201, json: async () => ROW })
    const result = await createTool.execute({ title: "Team lunch", amount: "42.50", justification: "Client meeting" })
    expect(result.ok).toBe(true)
    expect(useExpensesStore.getState().rows).toContainEqual(ROW)
  })

  it("does not touch the store when the create is refused with 403", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: "Forbidden" }) })
    const result = await createTool.execute({ title: "Team lunch", amount: "42.50", justification: "Client meeting" })
    expect(result.ok).toBe(false)
    expect(useExpensesStore.getState().rows).toEqual([])
  })

  it("does not touch the store when the API rejects with 400", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: "Invalid request" }) })
    const result = await createTool.execute({ title: "Team lunch", amount: "bad", justification: "Client meeting" })
    expect(result.ok).toBe(false)
    expect(useExpensesStore.getState().rows).toEqual([])
  })
})
