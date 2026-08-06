import { describe, it, expect } from "vitest"
import { REQUEST_STATUSES, transitionStatus } from "@/features/requests/lib/workflow"

describe("transitionStatus", () => {
  it("lists the four request statuses", () => {
    expect(REQUEST_STATUSES).toEqual(["pending", "approved", "rejected", "cancelled"])
  })

  it("approves a pending request", () => {
    expect(transitionStatus("pending", "approve")).toEqual({ ok: true, status: "approved" })
  })

  it("rejects a pending request", () => {
    expect(transitionStatus("pending", "reject")).toEqual({ ok: true, status: "rejected" })
  })

  it("cancels a pending request", () => {
    expect(transitionStatus("pending", "cancel")).toEqual({ ok: true, status: "cancelled" })
  })

  it("reopens a rejected request", () => {
    expect(transitionStatus("rejected", "reopen")).toEqual({ ok: true, status: "pending" })
  })

  it("refuses to reopen a pending request", () => {
    expect(transitionStatus("pending", "reopen").ok).toBe(false)
  })

  it("refuses to decide a request that is already approved", () => {
    expect(transitionStatus("approved", "approve").ok).toBe(false)
    expect(transitionStatus("approved", "reject").ok).toBe(false)
    expect(transitionStatus("approved", "cancel").ok).toBe(false)
  })

  it("refuses to decide a cancelled request", () => {
    expect(transitionStatus("cancelled", "approve").ok).toBe(false)
    expect(transitionStatus("cancelled", "reopen").ok).toBe(false)
    expect(transitionStatus("cancelled", "cancel").ok).toBe(false)
  })

  it("refuses to approve a rejected request without reopening it first", () => {
    expect(transitionStatus("rejected", "approve").ok).toBe(false)
  })
})
