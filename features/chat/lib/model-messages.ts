import type { UIMessage, ModelMessage, JSONValue } from "ai"

function toolNameFromPart(part: UIMessage["parts"][number]): string | null {
  if (part.type === "dynamic-tool") {
    return part.toolName
  }
  if (typeof part.type === "string" && part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length)
  }
  return null
}

function stringifyInput(input: unknown): string {
  if (typeof input === "string") {
    try {
      JSON.parse(input)
      return input
    } catch {
      return JSON.stringify(input)
    }
  }
  return JSON.stringify(input ?? {})
}

export function uiMessagesToModelMessages(messages: UIMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = []

  for (const message of messages) {
    if (message.role === "user") {
      modelMessages.push({
        role: "user",
        content: message.parts
          .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
          .map((part) => ({ type: "text", text: part.text })),
      })
      continue
    }

    if (message.role !== "assistant") continue

    const content: NonNullable<
      Extract<ModelMessage, { role: "assistant" }>["content"]
    > = []

    for (const part of message.parts) {
      if (part.type === "text") {
        content.push({ type: "text", text: part.text })
        continue
      }

      const toolName = toolNameFromPart(part)
      if (!toolName) continue

      const partState = "state" in part ? part.state : undefined
      const toolCallId = "toolCallId" in part ? String(part.toolCallId) : "call"
      const input = "input" in part ? part.input : undefined

      const hasResult = partState === "output-available" || partState === "output-error"

      content.push({
        type: "tool-call",
        toolCallId,
        toolName,
        input: stringifyInput(input),
        ...(hasResult ? { providerExecuted: true } : {}),
      })

      if (partState === "output-available") {
        const output = "output" in part ? part.output : undefined
        content.push({
          type: "tool-result",
          toolCallId,
          toolName,
          output: { type: "json", value: output as JSONValue },
        })
      } else if (partState === "output-error") {
        const errorText = "errorText" in part && part.errorText ? part.errorText : "Tool execution failed."
        content.push({
          type: "tool-result",
          toolCallId,
          toolName,
          output: { type: "error-text", value: errorText },
        })
      }
    }

    modelMessages.push({ role: "assistant", content })
  }

  return modelMessages
}
