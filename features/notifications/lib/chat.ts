import type { UIMessage } from "ai"
import { isToolPart, toolNameFromPart } from "@/features/chat/lib/parts"
import { shouldRequireApproval } from "@/features/chat/lib/approval"
import type { ChatTool } from "@/features/chat/types"

export type ChatTurnVariant = "finished" | "awaitingApproval"

export interface ChatNotification {
  variant: ChatTurnVariant
  body: string
}

const MAX_BODY_LENGTH = 140

const PENDING_TOOL_STATES = new Set(["input-available"])

export function isTurnAwaitingApproval(messages: UIMessage[], tools: ChatTool[]): boolean {
  const last = messages[messages.length - 1]
  if (!last || last.role !== "assistant") return false
  return last.parts.some((part) => {
    if (!isToolPart(part) || !PENDING_TOOL_STATES.has(part.state)) return false
    const toolId = toolNameFromPart(part)
    if (!toolId) return false
    const tool = tools.find((t) => t.id === toolId)
    return tool !== undefined && shouldRequireApproval(tool)
  })
}

export function lastAssistantFirstLine(messages: UIMessage[]): string | null {
  const last = [...messages].reverse().find((m) => m.role === "assistant")
  if (!last) return null
  const text = last.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim()
  if (!text) return null
  const firstLine = text.split("\n")[0]
  if (firstLine.length <= MAX_BODY_LENGTH) return firstLine
  return `${firstLine.slice(0, MAX_BODY_LENGTH - 1)}…`
}

export function buildChatNotification(messages: UIMessage[], tools: ChatTool[]): ChatNotification {
  return {
    variant: isTurnAwaitingApproval(messages, tools) ? "awaitingApproval" : "finished",
    body: lastAssistantFirstLine(messages) ?? "",
  }
}
