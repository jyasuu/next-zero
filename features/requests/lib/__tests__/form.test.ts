import { describe, it, expect } from "vitest"
import { requestFormSchema } from "@/features/requests/lib/form"

describe("requestFormSchema", () => {
  it("accepts a valid request", () => {
    const result = requestFormSchema.safeParse({
      title: "Read-only access",
      access: "audit-log",
      justification: "I need to review access logs for the audit.",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a blank title", () => {
    const result = requestFormSchema.safeParse({
      title: "  ",
      access: "audit-log",
      justification: "I need to review access logs for the audit.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a missing access target", () => {
    const result = requestFormSchema.safeParse({
      title: "Read-only access",
      access: "",
      justification: "I need to review access logs for the audit.",
    })
    expect(result.success).toBe(false)
  })

  it("rejects a missing justification", () => {
    const result = requestFormSchema.safeParse({
      title: "Read-only access",
      access: "audit-log",
      justification: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects extra unknown fields", () => {
    const result = requestFormSchema.safeParse({
      title: "Read-only access",
      access: "audit-log",
      justification: "I need to review access logs for the audit.",
      status: "approved",
    })
    expect(result.success).toBe(false)
  })
})
