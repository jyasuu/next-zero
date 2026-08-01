import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isStepCount,
  jsonSchema,
  streamText,
  toUIMessageStream,
  tool,
} from "ai"
import type { ToolSet, UIMessage } from "ai"
import { getChatModel } from "@/features/chat/server/model"
import { buildSystemPrompt, type SystemPromptInput } from "@/features/chat/lib/prompts"
import { uiMessagesToModelMessages } from "@/features/chat/lib/model-messages"
import type { SerializedChatTool } from "@/features/chat/types"

export function chatToolSet(tools: SerializedChatTool[]): ToolSet {
  const toolSet: ToolSet = {}
  for (const t of tools) {
    toolSet[t.id] = tool({
      description: t.description,
      inputSchema: jsonSchema(t.inputSchema as Record<string, unknown>),
    })
  }
  return toolSet
}

export function streamChatResponse(
  context: SystemPromptInput,
  messages: UIMessage[]
): Response {
  const system = buildSystemPrompt(context)
  const modelMessages = uiMessagesToModelMessages(messages)
  const toolSet = chatToolSet(context.tools)

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getChatModel(),
        system,
        messages: modelMessages,
        tools: toolSet,
        toolChoice: "auto",
        stopWhen: isStepCount(1),
      })
      writer.merge(toUIMessageStream({ stream: result.stream }))
    },
    onError: (error) => {
      console.error("Chat API error:", error)
      return "An error occurred while processing your request."
    },
  })

  return createUIMessageStreamResponse({ stream })
}
