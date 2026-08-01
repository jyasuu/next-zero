import type { ChatTool } from "@/features/chat/types"

export interface ToolScopeRegistration {
  id: string
  tools: ChatTool[]
}

export function mergeTools(
  globalTools: ChatTool[],
  scopes: ToolScopeRegistration[]
): ChatTool[] {
  const byId = new Map<string, ChatTool>()
  for (const tool of globalTools) {
    byId.set(tool.id, tool)
  }
  for (const scope of scopes) {
    for (const tool of scope.tools) {
      byId.set(tool.id, tool)
    }
  }
  return [...byId.values()]
}
