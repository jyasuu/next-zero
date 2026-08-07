import { describe, it, expect, vi } from "vitest"
import { createFormFillTool, type FormFillOutput } from "@/features/chat/tools/form-fill"
import { expenseFormSchema } from "@/features/expenses/lib/form"
import type { ToolExecutionResult } from "@/features/chat/types"

const tool = createFormFillTool({
  id: "expenses_form_fill",
  name: "Fill expense form",
  description: "Fills the expense form and returns the validation result.",
  schema: expenseFormSchema,
})

async function dataOf(result: ToolExecutionResult | Promise<ToolExecutionResult>): Promise<FormFillOutput> {
  const resolved = await result
  if (!resolved.ok) throw new Error("expected ok result")
  return resolved.data as FormFillOutput
}

describe("createFormFillTool", () => {
  it("produces a tool with auto approval and an id/name/description", () => {
    expect(tool.id).toBe("expenses_form_fill")
    expect(tool.name).toBe("Fill expense form")
    expect(tool.approval).toBe("auto")
    expect(tool.description.length).toBeGreaterThan(0)
  })

  it("accepts a full, valid fill and reports valid", async () => {
    const args = { title: "Team lunch", amount: "42.50", justification: "Client meeting" }
    const data = await dataOf(tool.execute(args))
    expect(data).toMatchObject({ valid: true, errors: {} })
    expect(data.values).toEqual(args)
  })

  it("reports an invalid fill as a result, not a failure, with per-field errors", async () => {
    const args = { title: "Team lunch", amount: "not-a-number", justification: "Client meeting" }
    const data = await dataOf(tool.execute(args))
    expect(data.valid).toBe(false)
    expect(data.errors.amount).toBeTruthy()
    expect(data.errors.title).toBeUndefined()
    expect(data.values).toEqual(args)
  })

  it("reports which fields are still missing on a partial fill", async () => {
    const data = await dataOf(tool.execute({ amount: "12.00" }))
    expect(data.valid).toBe(false)
    expect(data.errors.title).toBeTruthy()
    expect(data.errors.justification).toBeTruthy()
    expect(data.errors.amount).toBeUndefined()
  })

  it("rejects fields the form schema does not define", async () => {
    const data = await dataOf(
      tool.execute({ title: "Team lunch", amount: "42.50", justification: "Client meeting", surprise: "extra" })
    )
    expect(data.valid).toBe(false)
    expect(data.errors.surprise).toBeTruthy()
  })

  it("uses the same validation messages as the page form", async () => {
    const data = await dataOf(tool.execute({ title: "", amount: "0.0.0", justification: "" }))
    expect(data.valid).toBe(false)
    expect(data.errors.amount).toMatch(/invalid/i)
  })

  it("models every form field as a required string in its input schema", () => {
    const parsed = tool.inputSchema.safeParse({ title: "x", amount: "1.00", justification: "y" })
    expect(parsed.success).toBe(true)
    const partial = tool.inputSchema.safeParse({ amount: "1.00" })
    expect(partial.success).toBe(false)
  })

  it("never mutates or calls the network when executing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    void tool.execute({ title: "x", amount: "1.00", justification: "y" })
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
