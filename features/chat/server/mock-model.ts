import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4FunctionTool,
  LanguageModelV4Message,
  LanguageModelV4StreamPart,
  LanguageModelV4ToolResultOutput,
  JSONSchema7,
} from "@ai-sdk/provider"

const FIXTURES_BY_PROPERTY: Record<string, string> = {
  name: "Mock User",
  email: "mock@example.com",
  id: "1",
  title: "Mock title",
  description: "Mock description",
  password: "mock-password",
}

export function generateToolArgs(tool: LanguageModelV4FunctionTool): Record<string, unknown> {
  const schema = tool.inputSchema as JSONSchema7
  const required = schema.required ?? []
  const properties = (schema.properties ?? {}) as Record<string, JSONSchema7>
  const args: Record<string, unknown> = {}

  for (const prop of required) {
    const propSchema = properties[prop] ?? {}
    const valueFor = (p: string, s: JSONSchema7): unknown => {
      if (Array.isArray(s.enum) && s.enum.length > 0) return s.enum[0]
      if (s.type === "boolean") return true
      if (s.type === "number" || s.type === "integer") return 1
      if (s.type === "object") return {}
      if (s.type === "array") return []
      if (s.type === "null") return null
      return FIXTURES_BY_PROPERTY[p] ?? `mock-${p}`
    }
    args[prop] = valueFor(prop, propSchema)
  }

  return args
}

function intentOf(text: string): "create" | "delete" | "update" | "read" | null {
  const lower = text.toLowerCase()
  if (/(create|add|new|make|insert|register)/.test(lower)) return "create"
  if (/(delete|remove|destroy|erase)/.test(lower)) return "delete"
  if (/(update|edit|change|modify|rename)/.test(lower)) return "update"
  if (/(list|read|show|get|fetch|find|search|all)/.test(lower)) return "read"
  return null
}

export function pickToolIntent(
  text: string,
  tools: LanguageModelV4FunctionTool[]
): string | null {
  if (tools.length === 0) return null
  const intent = intentOf(text)
  if (intent === "create") {
    const tool = tools.find((t) => t.name.includes("create") || t.name.includes(".add"))
    if (tool) return tool.name
  }
  if (intent === "delete") {
    const tool = tools.find((t) => t.name.includes("delete") || t.name.includes(".remove"))
    if (tool) return tool.name
  }
  if (intent === "update") {
    const tool = tools.find((t) => t.name.includes("update") || t.name.includes(".edit"))
    if (tool) return tool.name
  }
  if (intent === "read") {
    const tool = tools.find((t) => t.name.includes("list") || t.name.includes(".read") || t.name.includes(".get"))
    if (tool) return tool.name
    return tools[0].name
  }
  if (intent === null) {
    const tool = tools.find((t) => /whoami|identity|access/.test(t.name))
    if (tool) return tool.name
  }
  return null
}

function findToolResultOutput(prompt: LanguageModelV4Message[]): LanguageModelV4ToolResultOutput | null {
  for (const message of prompt) {
    if (message.role !== "assistant") continue
    for (const part of message.content) {
      if (part.type === "tool-result") return part.output
    }
  }
  return null
}

function isErrorOutput(output: LanguageModelV4ToolResultOutput): boolean {
  return (
    output.type === "error-text" ||
    output.type === "error-json" ||
    output.type === "execution-denied"
  )
}

function describeOutput(output: LanguageModelV4ToolResultOutput): string {
  switch (output.type) {
    case "execution-denied":
      return output.reason ?? "the user denied the action"
    case "error-text":
      return output.value
    case "error-json":
      return JSON.stringify(output.value)
    case "text":
      return output.value
    case "json":
      return JSON.stringify(output.value)
    case "content":
      return JSON.stringify(output.value)
  }
}

function finishPart(reason: "stop" | "tool-calls"): LanguageModelV4StreamPart {
  return {
    type: "finish",
    finishReason: { unified: reason, raw: undefined },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
  }
}

function textParts(text: string): LanguageModelV4StreamPart[] {
  const id = "mock-text"
  return [
    { type: "text-start", id },
    { type: "text-delta", id, delta: text },
    { type: "text-end", id },
  ]
}

export function createMockModel(): LanguageModelV4 {
  const doStream = async (
    options: LanguageModelV4CallOptions
  ): Promise<{ stream: ReadableStream<LanguageModelV4StreamPart> }> => {
    const prompt = options.prompt ?? []
    const tools = (options.tools ?? []).filter(
      (t): t is LanguageModelV4FunctionTool => t.type === "function"
    )

    const toolResultOutput = findToolResultOutput(prompt)
    let parts: LanguageModelV4StreamPart[]

    if (toolResultOutput) {
      const text = isErrorOutput(toolResultOutput)
        ? `The requested action was refused: ${describeOutput(toolResultOutput)}`
        : `The action was completed successfully. ${describeOutput(toolResultOutput)}`
      parts = [...textParts(text), finishPart("stop")]
    } else {
      const lastUser = [...prompt].reverse().find(
        (m): m is Extract<LanguageModelV4Message, { role: "user" }> => m.role === "user"
      )
      const lastUserText =
        lastUser?.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join(" ") ?? ""

      const toolName = pickToolIntent(lastUserText, tools)
      if (!toolName) {
        parts = [
          ...textParts(
            `I have no tool available for that request on this page. Ask a question that one of the available tools can answer.`
          ),
          finishPart("stop"),
        ]
      } else {
        const tool = tools.find((t) => t.name === toolName)!
        const args = generateToolArgs(tool)
        parts = [
          {
            type: "tool-call",
            toolCallId: `mock-call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            toolName,
            input: JSON.stringify(args),
          },
          finishPart("tool-calls"),
        ]
      }
    }

    return { stream: new ReadableStream({ start(controller) { for (const part of parts) controller.enqueue(part); controller.close() } }) }
  }

  return {
    specificationVersion: "v4",
    provider: "mock",
    modelId: "mock-chat",
    supportedUrls: {},
    doStream,
    async doGenerate(options) {
      const { stream } = await doStream(options)
      const collected: string[] = []
      const reader = stream.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value.type === "text-delta") collected.push(value.delta)
      }
      return {
        content: [{ type: "text", text: collected.join("") }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 0, text: 0, reasoning: 0 },
        },
        warnings: [],
      }
    },
  }
}
