export type Effect = "Allow" | "Deny"

export interface PolicyStatement {
  Sid?: string
  Effect: Effect
  Action: string[]
  Resource?: string[]
}

export interface Policy {
  Version: string
  Statement: PolicyStatement[]
}

export function actionMatches(pattern: string, action: string): boolean {
  if (pattern === "*") return true
  if (pattern === action) return true
  const [pDomain, pVerb] = pattern.split(":")
  const [aDomain, aVerb] = action.split(":")
  if (aVerb === undefined) return pattern === action
  if (pVerb === undefined) return pattern === action
  if (pDomain === "*" && pVerb === aVerb) return true
  if (pVerb === "*" && pDomain === aDomain) return true
  return false
}

function resourceMatches(patterns: string[], resource: string): boolean {
  return patterns.some((p) => {
    if (p === "*") return true
    if (p === resource) return true
    if (p.endsWith("/*") && resource.startsWith(p.slice(0, -1))) return true
    return false
  })
}

export function evaluate(
  action: string,
  policies: Policy[],
  resource?: string
): boolean {
  let allowed = false
  for (const policy of policies) {
    for (const stmt of policy.Statement) {
      const actionMatch = stmt.Action.some((a) => actionMatches(a, action))
      if (!actionMatch) continue
      if (resource && !resourceMatches(stmt.Resource ?? ["*"], resource)) continue
      if (stmt.Effect === "Deny") return false
      allowed = true
    }
  }
  return allowed
}

export interface RolePolicies {
  permissions?: string[]
  policies?: Policy[]
}

export function ability(role: RolePolicies, isAdmin = false) {
  const allPolicies: Policy[] = [
    ...(role.policies ?? []),
  ]
  if (role.permissions && role.permissions.length > 0) {
    allPolicies.push({
      Version: "1",
      Statement: [{ Effect: "Allow", Action: role.permissions }],
    })
  }
  return {
    can(action: string, resource?: string) {
      if (isAdmin) return true
      return evaluate(action, allPolicies, resource)
    },
  }
}
