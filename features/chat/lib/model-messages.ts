import type { UIMessage, ModelMessage, JSONValue } from "ai"
import {
  isOutputAvailable,
  isOutputError,
  isToolPart,
  toolNameFromPart,
} from "@/features/chat/lib/parts"

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
      if (!isToolPart(part)) continue

      const toolName = toolNameFromPart(part)
      if (!toolName) continue

      const toolCallId = "toolCallId" in part ? String(part.toolCallId) : "call"
      const input = "input" in part ? part.input : undefined
      const hasResult = isOutputAvailable(part) || isOutputError(part)

      content.push({
        type: "tool-call",
        toolCallId,
        toolName,
        input: stringifyInput(input),
        ...(hasResult ? { providerExecuted: true } : {}),
      })

      if (isOutputAvailable(part)) {
        const output = "output" in part ? part.output : undefined
        content.push({
          type: "tool-result",
          toolCallId,
          toolName,
          output: { type: "json", value: output as JSONValue },
        })
      } else if (isOutputError(part)) {
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
