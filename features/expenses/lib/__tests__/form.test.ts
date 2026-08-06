import { describe, it, expect } from "vitest"
import { expenseFormSchema } from "@/features/expenses/lib/form"

const valid = {
  title: "Conference travel",
  amount: "250.00",
  justification: "Airfare for the Q3 user conference.",
}

describe("expenseFormSchema", () => {
  it("accepts a valid expense", () => {
    expect(expenseFormSchema.safeParse(valid).success).toBe(true)
  })

  it("accepts an integer amount", () => {
    expect(expenseFormSchema.safeParse({ ...valid, amount: "250" }).success).toBe(true)
  })

  it("rejects a blank title", () => {
    const result = expenseFormSchema.safeParse({ ...valid, title: "  " })
    expect(result.success).toBe(false)
  })

  it("rejects a missing amount", () => {
    const result = expenseFormSchema.safeParse({ ...valid, amount: "" })
    expect(result.success).toBe(false)
  })

  it("rejects a non-numeric amount", () => {
    const result = expenseFormSchema.safeParse({ ...valid, amount: "two hundred" })
    expect(result.success).toBe(false)
  })

  it("rejects an amount with more than two decimals", () => {
    const result = expenseFormSchema.safeParse({ ...valid, amount: "250.123" })
    expect(result.success).toBe(false)
  })

  it("rejects a negative amount", () => {
    const result = expenseFormSchema.safeParse({ ...valid, amount: "-5" })
    expect(result.success).toBe(false)
  })

  it("rejects a missing justification", () => {
    const result = expenseFormSchema.safeParse({ ...valid, justification: "" })
    expect(result.success).toBe(false)
  })

  it("rejects extra unknown fields", () => {
    const result = expenseFormSchema.safeParse({ ...valid, status: "approved" })
    expect(result.success).toBe(false)
  })
})
