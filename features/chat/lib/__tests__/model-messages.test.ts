import { describe, it, expect } from "vitest"
import { uiMessagesToModelMessages } from "@/features/chat/lib/model-messages"
import type { UIMessage } from "ai"

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
  input: { name: "Ada", email: "ada@example.com" },
  ...overrides,
})

describe("uiMessagesToModelMessages", () => {
  it("returns an empty list for no messages", () => {
    expect(uiMessagesToModelMessages([])).toEqual([])
  })

  it("maps a user text message", () => {
    expect(uiMessagesToModelMessages([userText("Create a user")])).toEqual([
      {
        role: "user",
        content: [{ type: "text", text: "Create a user" }],
      },
    ])
  })

  it("maps an assistant text message", () => {
    expect(uiMessagesToModelMessages([assistantText("Done")])).toEqual([
      {
        role: "assistant",
        content: [{ type: "text", text: "Done" }],
      },
    ])
  })

  it("maps an unexecuted tool part to a tool call only", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ ...toolPart({ state: "input-available" }) } as never],
    }
    expect(uiMessagesToModelMessages([message])).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "users_create",
            input: { name: "Ada", email: "ada@example.com" },
          },
        ],
      },
    ])
  })

  it("parses a json-string tool input to an object", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          ...toolPart({
            state: "input-available",
            input: JSON.stringify({ name: "Ada", email: "ada@example.com" }),
          }),
        } as never,
      ],
    }
    const modelMessages = uiMessagesToModelMessages([message])
    const toolCall = (modelMessages[0] as { content: { type: string; input: unknown }[] }).content.find(
      (p) => p.type === "tool-call"
    )
    expect(toolCall?.input).toEqual({ name: "Ada", email: "ada@example.com" })
  })

  it("maps an executed tool part to a tool call plus a json tool result message", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          ...toolPart({
            state: "output-available",
            output: { ok: true, data: { id: "99" } },
          }),
        } as never,
      ],
    }
    expect(uiMessagesToModelMessages([message])).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "users_create",
            input: { name: "Ada", email: "ada@example.com" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "users_create",
            output: { type: "json", value: { ok: true, data: { id: "99" } } },
          },
        ],
      },
    ])
  })

  it("maps a denied tool part to a tool call plus an error tool result message", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          ...toolPart({
            state: "output-error",
            errorText: "User denied this tool call.",
            output: undefined,
          }),
        } as never,
      ],
    }
    expect(uiMessagesToModelMessages([message])).toEqual([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call_1",
            toolName: "users_create",
            input: { name: "Ada", email: "ada@example.com" },
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call_1",
            toolName: "users_create",
            output: { type: "error-text", value: "User denied this tool call." },
          },
        ],
      },
    ])
  })

  it("keeps the full conversation order", () => {
    const modelMessages = uiMessagesToModelMessages([
      userText("List users"),
      assistantText("Here you go"),
    ])
    expect(modelMessages.map((m) => m.role)).toEqual(["user", "assistant"])
  })

  it("emits a single tool call for duplicate parts sharing a toolCallId", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        { ...toolPart({ state: "output-available", output: { ok: true, data: { id: "99" } } }) } as never,
        { ...toolPart({ state: "output-available", output: { ok: true, data: { id: "99" } } }) } as never,
      ],
    }
    const modelMessages = uiMessagesToModelMessages([message])
    const assistant = modelMessages[0] as { content: { type: string }[] }
    const tool = modelMessages[1] as { content: { type: string }[] }
    expect(assistant.content.filter((p) => p.type === "tool-call")).toHaveLength(1)
    expect(tool.content.filter((p) => p.type === "tool-result")).toHaveLength(1)
  })
})
