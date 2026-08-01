import { describe, it, expect } from "vitest"
import { z } from "zod"
import { mergeTools } from "@/features/chat/lib/scopes"
import type { ChatTool } from "@/features/chat/types"

function makeTool(id: string, name = id): ChatTool {
  return {
    id,
    name,
    description: `${name} does things`,
    inputSchema: z.object({}),
    approval: "auto",
    execute: () => ({ ok: true, data: null }),
  }
}

const globalA = makeTool("global.a")
const globalB = makeTool("global.b")

describe("mergeTools", () => {
  it("returns an empty set when nothing is registered", () => {
    expect(mergeTools([], [])).toEqual([])
  })

  it("returns the global tools when no page scope is registered", () => {
    expect(mergeTools([globalA, globalB], [])).toEqual([globalA, globalB])
  })

  it("combines global tools with registered page scopes", () => {
    const page = makeTool("users.read")
    const merged = mergeTools([globalA], [{ id: "users-page", tools: [page] }])
    expect(merged).toEqual([globalA, page])
  })

  it("merges tools from multiple page scopes", () => {
    const a = makeTool("users.read")
    const b = makeTool("roles.read")
    const merged = mergeTools([globalA], [
      { id: "users", tools: [a] },
      { id: "roles", tools: [b] },
    ])
    expect(merged).toEqual([globalA, a, b])
  })

  it("dedupes by tool id, later scope wins", () => {
    const v1 = makeTool("shared")
    const v2 = makeTool("shared")
    const merged = mergeTools([globalA], [
      { id: "scope-1", tools: [v1] },
      { id: "scope-2", tools: [v2] },
    ])
    expect(merged).toEqual([globalA, v2])
  })

  it("lets a page scope override a global tool with the same id", () => {
    const override = makeTool("global.a")
    const merged = mergeTools([globalA, globalB], [{ id: "page", tools: [override] }])
    expect(merged).toEqual([override, globalB])
  })

  it("ignores scopes with no tools", () => {
    const userTool = makeTool("users.read")
    const merged = mergeTools([globalA], [
      { id: "empty", tools: [] },
      { id: "users", tools: [userTool] },
    ])
    expect(merged).toEqual([globalA, userTool])
  })

  it("does not mutate the input arrays", () => {
    const page = makeTool("users.read")
    const global = [globalA]
    const scopes = [{ id: "page", tools: [page] }]
    mergeTools(global, scopes)
    expect(global).toHaveLength(1)
    expect(scopes[0].tools).toHaveLength(1)
  })
})
