import { describe, it, expect } from "vitest"
import type { UIMessage } from "ai"
import {
  buildChatNotification,
  isTurnAwaitingApproval,
  lastAssistantFirstLine,
} from "@/features/notifications/lib/chat"
import { usersTools } from "@/features/chat/tools/users"

const usersCreate = usersTools.find((t) => t.id === "users_create")!
const usersList = usersTools.find((t) => t.id === "users_list")!

const userText = (text: string): UIMessage => ({
  id: "u1",
  role: "user",
  parts: [{ type: "text", text }],
})

const assistantText = (text: string): UIMessage => ({
  id: "a1",
  role: "assistant",
  parts: [{ type: "text", text }],
})

const toolPart = (overrides: Record<string, unknown>) => ({
  type: "tool-users_create",
  toolCallId: "call_1",
  toolName: "users_create",
  input: { name: "Ada" },
  ...overrides,
})

const pendingToolMessage = (overrides: Record<string, unknown> = {}): UIMessage => ({
  id: "a1",
  role: "assistant",
  parts: [{ ...toolPart({ state: "input-available" }), ...overrides }] as never,
})

const longLine = (n: number) => "x".repeat(n)

describe("isTurnAwaitingApproval", () => {
  it("is false for an empty history", () => {
    expect(isTurnAwaitingApproval([], [usersCreate])).toBe(false)
  })

  it("is false when the last message is from the user", () => {
    expect(isTurnAwaitingApproval([userText("Create a user")], [usersCreate])).toBe(false)
  })

  it("is false for a text-only assistant reply", () => {
    expect(isTurnAwaitingApproval([assistantText("Done")], [usersCreate])).toBe(false)
  })

  it("is true when a write tool is pending approval", () => {
    expect(isTurnAwaitingApproval([pendingToolMessage()], [usersCreate])).toBe(true)
  })

  it("is false when the pending tool auto-executes", () => {
    expect(isTurnAwaitingApproval([pendingToolMessage({ toolName: "users_list" })], [usersList])).toBe(false)
  })

  it("is false when the pending tool is not registered", () => {
    expect(isTurnAwaitingApproval([pendingToolMessage({ toolName: "mystery_tool" })], [])).toBe(false)
  })

  it("is false when the tool call already has an output", () => {
    expect(
      isTurnAwaitingApproval([pendingToolMessage({ state: "output-available", output: { ok: true } })], [usersCreate])
    ).toBe(false)
  })
})

describe("lastAssistantFirstLine", () => {
  it("returns null when there is no assistant text", () => {
    expect(lastAssistantFirstLine([userText("Hi")])).toBeNull()
    expect(lastAssistantFirstLine([pendingToolMessage()])).toBeNull()
  })

  it("returns the first line of the last assistant reply", () => {
    const messages = [assistantText("Old"), assistantText("First line\nSecond line")]
    expect(lastAssistantFirstLine(messages)).toBe("First line")
  })

  it("truncates an over-long line with an ellipsis", () => {
    const line = lastAssistantFirstLine([assistantText(longLine(200))])
    expect(line?.length).toBe(140)
    expect(line).toMatch(/…$/)
  })

  it("does not truncate a line at the limit", () => {
    expect(lastAssistantFirstLine([assistantText(longLine(140))])).toBe(longLine(140))
  })
})

describe("buildChatNotification", () => {
  it("flags a pending write tool as awaiting approval", () => {
    const { variant } = buildChatNotification([pendingToolMessage()], [usersCreate])
    expect(variant).toBe("awaitingApproval")
  })

  it("flags a completed text turn as finished with the reply as the body", () => {
    const { variant, body } = buildChatNotification([userText("Hi"), assistantText("All done now")], [usersList])
    expect(variant).toBe("finished")
    expect(body).toBe("All done now")
  })

  it("produces an empty body when the turn has no text to show", () => {
    const { variant, body } = buildChatNotification([pendingToolMessage({ toolName: "users_list" })], [usersList])
    expect(variant).toBe("finished")
    expect(body).toBe("")
  })
})
