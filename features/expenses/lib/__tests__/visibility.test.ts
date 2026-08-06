import { describe, it, expect } from "vitest"
import type { ExpenseRow } from "@/features/expenses/lib/visibility"
import {
  canApproveExpense,
  canCancelExpense,
  canCreateExpense,
  canReadExpenses,
  canSeeExpense,
  type ExpensesActor,
} from "@/features/expenses/lib/visibility"

const actor = (overrides: Partial<ExpensesActor> = {}): ExpensesActor => ({
  email: "requester@example.com",
  isAdmin: false,
  can: () => false,
  ...overrides,
})

const expense = (overrides: Partial<ExpenseRow> = {}): ExpenseRow => ({
  id: "1",
  requester_email: "requester@example.com",
  title: "Conference travel",
  amount: "250.00",
  justification: "Airfare for the Q3 user conference.",
  status: "pending",
  decided_by: null,
  decision_comment: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  decided_at: null,
  ...overrides,
})

describe("actor permissions", () => {
  it("grants expense reading to the expenses:Read permission", () => {
    expect(canReadExpenses(actor({ can: (a) => a === "expenses:Read" }))).toBe(true)
    expect(canReadExpenses(actor())).toBe(false)
  })

  it("grants expense creation to the expenses:Create permission", () => {
    expect(canCreateExpense(actor({ can: (a) => a === "expenses:Create" }))).toBe(true)
    expect(canCreateExpense(actor())).toBe(false)
  })

  it("grants approval to the expenses:Approve permission or admin", () => {
    expect(canApproveExpense(actor({ can: (a) => a === "expenses:Approve" }))).toBe(true)
    expect(canApproveExpense(actor({ isAdmin: true }))).toBe(true)
    expect(canApproveExpense(actor())).toBe(false)
  })
})

describe("expense visibility", () => {
  it("lets an approver see any expense", () => {
    const approver = actor({ email: "boss@example.com", can: (a) => a === "expenses:Approve" })
    expect(canSeeExpense(approver, expense({ requester_email: "someone@example.com" }))).toBe(true)
  })

  it("lets a requester see only their own expenses", () => {
    expect(canSeeExpense(actor(), expense({ requester_email: "requester@example.com" }))).toBe(true)
    expect(canSeeExpense(actor(), expense({ requester_email: "someone@example.com" }))).toBe(false)
  })
})

describe("cancellation", () => {
  it("lets the requester cancel their own pending expense", () => {
    expect(canCancelExpense(actor({ can: (a) => a === "expenses:Create" }), expense())).toBe(true)
  })

  it("refuses cancellation of another user's expense", () => {
    expect(
      canCancelExpense(
        actor({ can: (a) => a === "expenses:Create" }),
        expense({ requester_email: "someone@example.com" })
      )
    ).toBe(false)
  })

  it("refuses cancellation of an expense that is no longer pending", () => {
    expect(
      canCancelExpense(actor({ can: (a) => a === "expenses:Create" }), expense({ status: "approved" }))
    ).toBe(false)
  })

  it("refuses cancellation without the expenses:Create permission", () => {
    expect(canCancelExpense(actor(), expense())).toBe(false)
  })
})
