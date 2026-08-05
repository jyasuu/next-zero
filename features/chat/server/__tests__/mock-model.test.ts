import { describe, it, expect } from "vitest"
import { createMockModel, pickToolIntent, generateToolArgs } from "@/features/chat/server/mock-model"
import { TITLE_SYSTEM_PROMPT } from "@/features/chat/lib/title"
import type { JSONValue } from "@ai-sdk/provider"
import type { LanguageModelV4CallOptions, LanguageModelV4FunctionTool, LanguageModelV4Message, LanguageModelV4StreamPart } from "@ai-sdk/provider"

const usersCreateTool: LanguageModelV4FunctionTool = {
  type: "function",
  name: "users_create",
  description: "Creates a new user",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      email: { type: "string" },
      role: { type: "string", enum: ["Admin", "Editor", "Viewer"] },
      active: { type: "boolean" },
      quota: { type: "number" },
    },
    required: ["name", "email", "role"],
  },
}

const usersDeleteTool: LanguageModelV4FunctionTool = {
  type: "function",
  name: "users_delete",
  description: "Deletes a user",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
}

const usersListTool: LanguageModelV4FunctionTool = {
  type: "function",
  name: "users_list",
  description: "Lists users",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
}

const accountAccessTool: LanguageModelV4FunctionTool = {
  type: "function",
  name: "account_access",
  description: "Reports the caller's access",
  inputSchema: { type: "object", properties: {}, required: [] },
}

function firstTurn(text: string): LanguageModelV4Message[] {
  return [{ role: "user", content: [{ type: "text", text }] }]
}

function continuationTurn(kind: "json" | "error", value: unknown = { ok: true }): LanguageModelV4Message[] {
  return [
    { role: "user", content: [{ type: "text", text: "Create a user" }] },
    {
      role: "assistant",
      content: [
        { type: "tool-call", toolCallId: "call_1", toolName: "users_create", input: "{}" },
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "users_create",
          output:
            kind === "json"
              ? { type: "json", value: value as JSONValue }
              : { type: "error-text", value: "Forbidden" },
        },
      ],
    },
  ]
}

async function readStream(stream: ReadableStream<LanguageModelV4StreamPart>): Promise<LanguageModelV4StreamPart[]> {
  const parts: LanguageModelV4StreamPart[] = []
  const reader = stream.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value)
  }
  return parts
}

async function collect(model: ReturnType<typeof createMockModel>, options: Partial<LanguageModelV4CallOptions>) {
  const result = await model.doStream({
    ...(options as LanguageModelV4CallOptions),
    prompt: options.prompt ?? [],
  })
  const parts = await readStream(result.stream)
  return { parts, result }
}

describe("pickToolIntent", () => {
  it("prefers a create tool for create intents", () => {
    expect(pickToolIntent("Create a new user named Ada", [usersListTool, usersCreateTool, usersDeleteTool])).toBe("users_create")
  })

  it("prefers a delete tool for delete intents", () => {
    expect(pickToolIntent("Delete the user", [usersListTool, usersCreateTool, usersDeleteTool])).toBe("users_delete")
  })

  it("prefers a list tool for read intents", () => {
    expect(pickToolIntent("List all users", [usersListTool, usersCreateTool])).toBe("users_list")
  })

  it("falls back to the first tool for a read intent with no read tool", () => {
    expect(pickToolIntent("Show me the user directory", [usersCreateTool, usersDeleteTool])).toBe("users_create")
  })

  it("returns null when no tools are available", () => {
    expect(pickToolIntent("Create a user", [])).toBeNull()
  })

  it("returns null when the user asks a question with no tool intent", () => {
    expect(pickToolIntent("How do I reset my password?", [usersListTool, usersCreateTool])).toBeNull()
  })

  it("returns null when no tool matches the intent", () => {
    expect(pickToolIntent("Create a user", [accountAccessTool])).toBeNull()
  })

  it("picks an identity tool for identity questions", () => {
    expect(pickToolIntent("Who am I?", [usersListTool, accountAccessTool])).toBe("account_access")
  })
})

describe("generateToolArgs", () => {
  it("fills required properties from their names and types", () => {
    const args = generateToolArgs(usersCreateTool)
    expect(args).toEqual({
      name: "Mock User",
      email: "mock@example.com",
      role: "Admin",
    })
  })

  it("fills required id for delete tools", () => {
    expect(generateToolArgs(usersDeleteTool)).toEqual({ id: "1" })
  })

  it("returns an empty object when nothing is required", () => {
    expect(generateToolArgs(usersListTool)).toEqual({})
  })
})

describe("createMockModel doStream", () => {
  it("returns the first user message as the title for a title-generation call", async () => {
    const model = createMockModel()
    const { parts } = await collect(model, {
      prompt: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text", text: "Hello there" }] },
      ],
    })

    expect(parts.some((p) => p.type === "tool-call")).toBe(false)
    const deltas = parts.filter((p) => p.type === "text-delta").map((p) => (p as { delta: string }).delta)
    expect(deltas.join("")).toBe("Hello there")
    const finish = parts.find((p) => p.type === "finish")
    if (finish && finish.type === "finish") {
      expect(finish.finishReason.unified).toBe("stop")
    }
  })

  it("truncates the title to the max length for a long first message", async () => {
    const model = createMockModel()
    const long = "a".repeat(120)
    const { parts } = await collect(model, {
      prompt: [
        { role: "system", content: TITLE_SYSTEM_PROMPT },
        { role: "user", content: [{ type: "text", text: long }] },
      ],
    })

    const deltas = parts.filter((p) => p.type === "text-delta").map((p) => (p as { delta: string }).delta)
    const title = deltas.join("")
    expect(title.length).toBe(60)
    expect(title.endsWith("…")).toBe(true)
  })

  it("emits a tool call on the first turn for a matching intent", async () => {
    const model = createMockModel()
    const { parts } = await collect(model, {
      prompt: firstTurn("Create a user"),
      tools: [usersListTool, usersCreateTool],
    })

    const toolCall = parts.find((p) => p.type === "tool-call")
    expect(toolCall).toBeDefined()
    if (toolCall && toolCall.type === "tool-call") {
      expect(toolCall.toolName).toBe("users_create")
      expect(JSON.parse(toolCall.input)).toEqual({
        name: "Mock User",
        email: "mock@example.com",
        role: "Admin",
      })
    }
    const finish = parts.find((p) => p.type === "finish")
    expect(finish).toBeDefined()
    if (finish && finish.type === "finish") {
      expect(finish.finishReason.unified).toBe("tool-calls")
    }
  })

  it("emits a success text on the continuation after an executed tool", async () => {
    const model = createMockModel()
    const { parts } = await collect(model, {
      prompt: continuationTurn("json"),
      tools: [usersListTool, usersCreateTool],
    })

    expect(parts.some((p) => p.type === "tool-call")).toBe(false)
    const deltas = parts.filter((p) => p.type === "text-delta").map((p) => (p as { delta: string }).delta)
    expect(deltas.join("")).toMatch(/success|completed/i)
    const finish = parts.find((p) => p.type === "finish")
    if (finish && finish.type === "finish") {
      expect(finish.finishReason.unified).toBe("stop")
    }
  })

  it("emits a refusal text when the tool result was an error", async () => {
    const model = createMockModel()
    const { parts } = await collect(model, {
      prompt: continuationTurn("error", "Forbidden"),
      tools: [usersListTool, usersCreateTool],
    })

    const deltas = parts.filter((p) => p.type === "text-delta").map((p) => (p as { delta: string }).delta)
    expect(deltas.join("")).toMatch(/refus/i)
  })

  it("responds with text instead of a tool call when no tool matches", async () => {
    const model = createMockModel()
    const { parts } = await collect(model, {
      prompt: firstTurn("Create a user"),
      tools: [accountAccessTool],
    })

    expect(parts.some((p) => p.type === "tool-call")).toBe(false)
    const deltas = parts.filter((p) => p.type === "text-delta").map((p) => (p as { delta: string }).delta)
    expect(deltas.join("")).toMatch(/no tool/i)
  })
})
