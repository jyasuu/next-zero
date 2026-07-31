import type { RolePolicies } from "@/lib/acl"

interface CacheEntry {
  role: RolePolicies
  expiresAt: number
}

export function createRoleCache(ttlMs: number) {
  const cache = new Map<string, CacheEntry>()

  return {
    get(name: string): RolePolicies | undefined {
      const entry = cache.get(name)
      if (!entry) return undefined
      if (Date.now() > entry.expiresAt) {
        cache.delete(name)
        return undefined
      }
      return entry.role
    },
    set(name: string, role: RolePolicies): void {
      cache.set(name, { role, expiresAt: Date.now() + ttlMs })
    },
    evict(name: string): void {
      cache.delete(name)
    },
    evictAll(): void {
      cache.clear()
    },
  }
}
