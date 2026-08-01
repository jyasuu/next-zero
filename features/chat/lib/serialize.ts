import { z } from "zod"
import type { ChatTool, SerializedChatTool } from "@/features/chat/types"

export function serializeTool(tool: ChatTool): SerializedChatTool {
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    inputSchema: z.toJSONSchema(tool.inputSchema) as Record<string, unknown>,
    approval: tool.approval,
  }
}
