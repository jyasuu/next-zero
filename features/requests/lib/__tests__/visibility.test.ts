import { describe, it, expect } from "vitest"
import type { RequestRow } from "@/features/requests/lib/visibility"
import {
  canApproveRequest,
  canCancelRequest,
  canCreateRequest,
  canReadRequests,
  canSeeRequest,
  type RequestsActor,
} from "@/features/requests/lib/visibility"

const actor = (overrides: Partial<RequestsActor> = {}): RequestsActor => ({
  email: "requester@example.com",
  isAdmin: false,
  can: () => false,
  ...overrides,
})

const request = (overrides: Partial<RequestRow> = {}): RequestRow => ({
  id: "1",
  requester_email: "requester@example.com",
  title: "Read-only access",
  access: "audit-log",
  justification: "I need to review access logs for the audit.",
  status: "pending",
  decided_by: null,
  decision_comment: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  decided_at: null,
  ...overrides,
})

describe("actor permissions", () => {
  it("grants request reading to the requests:Read permission", () => {
    expect(canReadRequests(actor({ can: (a) => a === "requests:Read" }))).toBe(true)
    expect(canReadRequests(actor())).toBe(false)
  })

  it("grants request creation to the requests:Create permission", () => {
    expect(canCreateRequest(actor({ can: (a) => a === "requests:Create" }))).toBe(true)
    expect(canCreateRequest(actor())).toBe(false)
  })

  it("grants approval to the requests:Approve permission or admin", () => {
    expect(canApproveRequest(actor({ can: (a) => a === "requests:Approve" }))).toBe(true)
    expect(canApproveRequest(actor({ isAdmin: true }))).toBe(true)
    expect(canApproveRequest(actor())).toBe(false)
  })
})

describe("request visibility", () => {
  it("lets an approver see any request", () => {
    const approver = actor({ email: "boss@example.com", can: (a) => a === "requests:Approve" })
    expect(canSeeRequest(approver, request({ requester_email: "someone@example.com" }))).toBe(true)
  })

  it("lets a requester see only their own requests", () => {
    expect(canSeeRequest(actor(), request({ requester_email: "requester@example.com" }))).toBe(true)
    expect(canSeeRequest(actor(), request({ requester_email: "someone@example.com" }))).toBe(false)
  })
})

describe("cancellation", () => {
  it("lets the requester cancel their own pending request", () => {
    expect(canCancelRequest(actor({ can: (a) => a === "requests:Create" }), request())).toBe(true)
  })

  it("refuses cancellation of another user's request", () => {
    expect(
      canCancelRequest(actor({ can: (a) => a === "requests:Create" }), request({ requester_email: "someone@example.com" }))
    ).toBe(false)
  })

  it("refuses cancellation of a request that is no longer pending", () => {
    expect(canCancelRequest(actor({ can: (a) => a === "requests:Create" }), request({ status: "approved" }))).toBe(false)
  })

  it("refuses cancellation without the requests:Create permission", () => {
    expect(canCancelRequest(actor(), request())).toBe(false)
  })
})
