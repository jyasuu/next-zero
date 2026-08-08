import { describe, it, expect } from "vitest"
import { dedupeToolParts } from "@/features/chat/lib/parts"

describe("dedupeToolParts", () => {
  it("keeps text parts and unique tool parts", () => {
    const parts = [
      { type: "text", text: "hi" },
      { type: "tool-question", toolCallId: "call-1", state: "output-available", output: { answers: [], summary: "s" } },
      { type: "tool-users_get", toolCallId: "call-2", state: "output-available", output: {} },
    ]
    const result = dedupeToolParts(parts)
    expect(result).toHaveLength(3)
    expect(result.map((part) => part.type)).toEqual(["text", "tool-question", "tool-users_get"])
  })

  it("drops duplicate tool parts sharing a toolCallId, keeping the first", () => {
    const parts = [
      { type: "text", text: "hi" },
      { type: "tool-question", toolCallId: "call-1", state: "input-available", input: { questions: [] } },
      { type: "tool-question", toolCallId: "call-1", state: "output-available", output: { answers: [], summary: "s" } },
    ]
    const result = dedupeToolParts(parts)
    expect(result).toHaveLength(2)
    expect(result[1]).toEqual(parts[1])
  })

  it("keeps tool parts with distinct toolCallIds", () => {
    const parts = [
      { type: "tool-users_get", toolCallId: "call-a", state: "output-available" },
      { type: "tool-users_get", toolCallId: "call-b", state: "output-available" },
    ]
    expect(dedupeToolParts(parts)).toHaveLength(2)
  })

  it("handles parts without a toolCallId", () => {
    const parts = [{ type: "text", text: "a" }, { type: "step-start" }]
    expect(dedupeToolParts(parts)).toHaveLength(2)
  })
})
