import { describe, it, expect } from "vitest"
import { usersTools } from "@/features/chat/tools/users"
import { globalTools } from "@/features/chat/tools/global"
import { hasToolRenderer } from "@/features/chat/components/tool-result"

describe("tool renderer registry", () => {
  it("covers every registered builtin tool", () => {
    const toolIds = [...usersTools, ...globalTools].map((tool) => tool.id)
    expect(toolIds.length).toBeGreaterThan(0)
    for (const id of toolIds) {
      expect(hasToolRenderer(id), `expected a renderer for tool "${id}"`).toBe(true)
    }
  })
})
