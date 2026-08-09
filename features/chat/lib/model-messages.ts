import type { UIMessage, ModelMessage, JSONValue } from "ai"
import {
  dedupeToolParts,
  isEmptyTextPart,
  isOutputAvailable,
  isOutputError,
  isToolPart,
  parseToolInput,
  toolNameFromPart,
} from "@/features/chat/lib/parts"

export function uiMessagesToModelMessages(messages: UIMessage[]): ModelMessage[] {
  const modelMessages: ModelMessage[] = []
  const seenToolCallIds = new Set<string>()

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
    const toolResults: NonNullable<
      Extract<ModelMessage, { role: "tool" }>["content"]
    > = []

    for (const part of dedupeToolParts(message.parts, seenToolCallIds)) {
      if (part.type === "text") {
        if (!isEmptyTextPart(part)) {
          content.push({ type: "text", text: part.text })
        }
        continue
      }
      if (!isToolPart(part)) continue

      const toolName = toolNameFromPart(part)
      if (!toolName) continue

      const toolCallId = "toolCallId" in part ? String(part.toolCallId) : "call"
      const input = "input" in part ? part.input : undefined

      content.push({
        type: "tool-call",
        toolCallId,
        toolName,
        input: parseToolInput(input),
      })

      if (isOutputAvailable(part)) {
        const output = "output" in part ? part.output : undefined
        toolResults.push({
          type: "tool-result",
          toolCallId,
          toolName,
          output: { type: "json", value: output as JSONValue },
        })
      } else if (isOutputError(part)) {
        const errorText = "errorText" in part && part.errorText ? part.errorText : "Tool execution failed."
        toolResults.push({
          type: "tool-result",
          toolCallId,
          toolName,
          output: { type: "error-text", value: errorText },
        })
      }
    }

    modelMessages.push({ role: "assistant", content })
    if (toolResults.length > 0) {
      modelMessages.push({ role: "tool", content: toolResults })
    }
  }

  return modelMessages
}
