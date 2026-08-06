import { describe, it, expect } from "vitest"
import { EXPENSE_STATUSES, transitionStatus } from "@/features/expenses/lib/workflow"

describe("transitionStatus", () => {
  it("lists the four expense statuses", () => {
    expect(EXPENSE_STATUSES).toEqual(["pending", "approved", "rejected", "cancelled"])
  })

  it("approves a pending expense", () => {
    expect(transitionStatus("pending", "approve")).toEqual({ ok: true, status: "approved" })
  })

  it("rejects a pending expense", () => {
    expect(transitionStatus("pending", "reject")).toEqual({ ok: true, status: "rejected" })
  })

  it("cancels a pending expense", () => {
    expect(transitionStatus("pending", "cancel")).toEqual({ ok: true, status: "cancelled" })
  })

  it("reopens a rejected expense", () => {
    expect(transitionStatus("rejected", "reopen")).toEqual({ ok: true, status: "pending" })
  })

  it("refuses to reopen a pending expense", () => {
    expect(transitionStatus("pending", "reopen").ok).toBe(false)
  })

  it("refuses to decide an expense that is already approved", () => {
    expect(transitionStatus("approved", "approve").ok).toBe(false)
    expect(transitionStatus("approved", "reject").ok).toBe(false)
    expect(transitionStatus("approved", "cancel").ok).toBe(false)
  })

  it("refuses to decide a cancelled expense", () => {
    expect(transitionStatus("cancelled", "approve").ok).toBe(false)
    expect(transitionStatus("cancelled", "reopen").ok).toBe(false)
    expect(transitionStatus("cancelled", "cancel").ok).toBe(false)
  })

  it("refuses to approve a rejected expense without reopening it first", () => {
    expect(transitionStatus("rejected", "approve").ok).toBe(false)
  })
})
