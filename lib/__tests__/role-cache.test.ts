import { describe, it, expect, vi, afterEach } from "vitest"
import { createRoleCache } from "@/lib/role-cache"
import type { RolePolicies } from "@/lib/acl"

const editorRole: RolePolicies = { permissions: ["read", "write"] }

describe("createRoleCache", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns undefined for unknown role", () => {
    const cache = createRoleCache(60_000)
    expect(cache.get("Editor")).toBeUndefined()
  })

  it("returns the cached role before TTL", () => {
    const cache = createRoleCache(60_000)
    cache.set("Editor", editorRole)
    expect(cache.get("Editor")).toBe(editorRole)
  })

  it("expires entries after the TTL", () => {
    vi.useFakeTimers()
    const cache = createRoleCache(60_000)
    cache.set("Editor", editorRole)
    vi.advanceTimersByTime(60_001)
    expect(cache.get("Editor")).toBeUndefined()
  })

  it("evicts a single role on demand", () => {
    const cache = createRoleCache(60_000)
    cache.set("Editor", editorRole)
    cache.evict("Editor")
    expect(cache.get("Editor")).toBeUndefined()
  })

  it("evicts all roles", () => {
    const cache = createRoleCache(60_000)
    cache.set("Editor", editorRole)
    cache.set("Viewer", { permissions: [] })
    cache.evictAll()
    expect(cache.get("Editor")).toBeUndefined()
    expect(cache.get("Viewer")).toBeUndefined()
  })
})
