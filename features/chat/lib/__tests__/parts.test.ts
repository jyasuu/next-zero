import { describe, it, expect } from "vitest"
import {
  dedupeToolParts,
  dedupeToolPartsAcrossMessages,
  filterEmptyTextParts,
  isEmptyTextPart,
} from "@/features/chat/lib/parts"

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

describe("dedupeToolPartsAcrossMessages", () => {
  it("drops a tool part whose toolCallId already appeared in an earlier message", () => {
    const messages = [
      { id: "a1", parts: [{ type: "tool-question", toolCallId: "call-1", state: "output-available" }] },
      { id: "a2", parts: [
        { type: "step-start" },
        { type: "tool-question", toolCallId: "call-1", state: "output-available" },
        { type: "tool-question", toolCallId: "call-2", state: "input-available" },
      ] },
    ]
    const result = dedupeToolPartsAcrossMessages(messages)
    expect(result[0].parts).toHaveLength(1)
    expect(result[1].parts.map((part) => part.type)).toEqual(["step-start", "tool-question"])
    expect((result[1].parts[1] as { toolCallId: string }).toolCallId).toBe("call-2")
  })

  it("keeps unique tool parts across all messages", () => {
    const messages = [
      { id: "a1", parts: [{ type: "tool-users_get", toolCallId: "call-a", state: "output-available" }] },
      { id: "a2", parts: [{ type: "tool-users_get", toolCallId: "call-b", state: "output-available" }] },
    ]
    const result = dedupeToolPartsAcrossMessages(messages)
    expect(result.flatMap((m) => m.parts)).toHaveLength(2)
  })
})

describe("isEmptyTextPart", () => {
  it("is false for text with content", () => {
    expect(isEmptyTextPart({ type: "text", text: "hello" })).toBe(false)
    expect(isEmptyTextPart({ type: "text", text: "  hello  " })).toBe(false)
  })

  it("is true for empty or whitespace-only text", () => {
    expect(isEmptyTextPart({ type: "text", text: "" })).toBe(true)
    expect(isEmptyTextPart({ type: "text", text: "   " })).toBe(true)
  })

  it("is false for non-text parts", () => {
    expect(isEmptyTextPart({ type: "tool-question", toolCallId: "call-1" })).toBe(false)
    expect(isEmptyTextPart({ type: "step-start" })).toBe(false)
  })
})

describe("filterEmptyTextParts", () => {
  it("drops empty text parts but keeps text with content and tool parts", () => {
    const messages = [
      {
        id: "a1",
        parts: [
          { type: "text", text: "" },
          { type: "tool-question", toolCallId: "call-1", state: "input-available" },
        ],
      },
      { id: "a2", parts: [{ type: "text", text: "Got it" }, { type: "text", text: "  " }] },
    ]
    const result = filterEmptyTextParts(messages)
    expect(result[0].parts.map((part) => part.type)).toEqual(["tool-question"])
    expect(result[1].parts.map((part) => part.type)).toEqual(["text"])
  })

  it("returns the messages unchanged when there is nothing to drop", () => {
    const messages = [
      { id: "a1", parts: [{ type: "text", text: "hi" }, { type: "tool-users_get", toolCallId: "call-1" }] },
    ]
    expect(filterEmptyTextParts(messages)).toEqual(messages)
  })
})
