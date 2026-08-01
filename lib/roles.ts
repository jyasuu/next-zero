import { queryRow } from "@/lib/db"
import type { Policy, RolePolicies } from "@/lib/acl"
import { createRoleCache } from "@/lib/role-cache"

const ROLE_CACHE_TTL_MS = 60_000

const cache = createRoleCache(ROLE_CACHE_TTL_MS)

export async function getRoleWithPolicies(name: string): Promise<RolePolicies | null> {
  const cached = cache.get(name)
  if (cached) return cached

  const row = await queryRow("SELECT permissions, policies FROM roles WHERE name = $1", [name])
  if (!row) return null

  const role: RolePolicies = {
    permissions: JSON.parse((row.permissions as string) ?? "[]") as string[],
    policies: JSON.parse((row.policies as string) ?? "[]") as Policy[],
  }
  cache.set(name, role)
  return role
}

export function evictRoleFromCache(name: string): void {
  cache.evict(name)
}
