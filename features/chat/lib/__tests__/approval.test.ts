import { describe, it, expect } from "vitest"
import { z } from "zod"
import { shouldRequireApproval, validateToolArgs } from "@/features/chat/lib/approval"
import type { ChatTool } from "@/features/chat/types"

function makeTool(approval: "always" | "auto"): ChatTool {
  return {
    id: "users_create",
    name: "Create user",
    description: "Creates a user",
    inputSchema: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["Admin", "Editor", "Viewer"]).optional(),
    }),
    approval,
    execute: () => ({ ok: true }),
  }
}

describe("shouldRequireApproval", () => {
  it("requires approval for always-policy tools", () => {
    expect(shouldRequireApproval(makeTool("always"))).toBe(true)
  })

  it("auto-executes auto-policy tools", () => {
    expect(shouldRequireApproval(makeTool("auto"))).toBe(false)
  })
})

describe("validateToolArgs", () => {
  it("accepts arguments matching the schema", () => {
    const result = validateToolArgs(
      makeTool("always").inputSchema,
      { name: "Ada", email: "ada@example.com" }
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.args).toEqual({ name: "Ada", email: "ada@example.com" })
    }
  })

  it("applies schema defaults during validation", () => {
    const tool = makeTool("always")
    const result = validateToolArgs(tool.inputSchema, { name: "Ada", email: "ada@example.com", role: undefined })
    expect(result.ok).toBe(true)
  })

  it("rejects arguments missing required fields", () => {
    const result = validateToolArgs(makeTool("always").inputSchema, { email: "ada@example.com" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it("rejects arguments with an invalid email", () => {
    const result = validateToolArgs(makeTool("always").inputSchema, {
      name: "Ada",
      email: "not-an-email",
    })
    expect(result.ok).toBe(false)
  })

  it("rejects extra unknown arguments", () => {
    const result = validateToolArgs(makeTool("always").inputSchema, {
      name: "Ada",
      email: "ada@example.com",
      extra: "nope",
    })
    expect(result.ok).toBe(false)
  })
})
