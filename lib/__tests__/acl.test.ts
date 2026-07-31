import { describe, it, expect } from "vitest"
import { evaluate, ability, actionMatches } from "@/lib/acl"

describe("actionMatches", () => {
  it("matches exact action", () => {
    expect(actionMatches("users:Read", "users:Read")).toBe(true)
  })

  it("rejects different action", () => {
    expect(actionMatches("users:Read", "users:Write")).toBe(false)
  })

  it("matches wildcard domain", () => {
    expect(actionMatches("*:Read", "users:Read")).toBe(true)
    expect(actionMatches("*:Read", "roles:Read")).toBe(true)
  })

  it("matches wildcard verb", () => {
    expect(actionMatches("users:*", "users:Read")).toBe(true)
    expect(actionMatches("users:*", "users:Manage")).toBe(true)
  })

  it("rejects wildcard verb on different domain", () => {
    expect(actionMatches("users:*", "roles:Read")).toBe(false)
  })

  it("matches global wildcard", () => {
    expect(actionMatches("*", "anything:AtAll")).toBe(true)
  })

  it("matches legacy flat permission", () => {
    expect(actionMatches("read", "read")).toBe(true)
  })

  it("rejects legacy flat permission against namespaced", () => {
    expect(actionMatches("read", "users:Read")).toBe(false)
  })
})

describe("evaluate", () => {
  const readOnlyPolicy = {
    Version: "1",
    Statement: [{ Effect: "Allow" as const, Action: ["*:Read"] }],
  }

  const fullAccessPolicy = {
    Version: "1",
    Statement: [{ Effect: "Allow" as const, Action: ["*"] }],
  }

  const denyDeletePolicy = {
    Version: "1",
    Statement: [
      { Effect: "Allow" as const, Action: ["*"] },
      { Effect: "Deny" as const, Action: ["*:Delete"] },
    ],
  }

  it("allows matching action", () => {
    expect(evaluate("users:Read", [readOnlyPolicy])).toBe(true)
  })

  it("denies non-matching action", () => {
    expect(evaluate("users:Write", [readOnlyPolicy])).toBe(false)
  })

  it("default deny when no statement matches", () => {
    expect(evaluate("users:Read", [])).toBe(false)
  })

  it("explicit deny overrides allow", () => {
    expect(evaluate("users:Delete", [denyDeletePolicy])).toBe(false)
  })

  it("allows non-denied action in deny policy", () => {
    expect(evaluate("users:Read", [denyDeletePolicy])).toBe(true)
  })

  it("allows all with wildcard", () => {
    expect(evaluate("anything:AtAll", [fullAccessPolicy])).toBe(true)
  })

  it("evaluates resource-scoped policy", () => {
    const scoped = {
      Version: "1",
      Statement: [{ Effect: "Allow" as const, Action: ["*:Read"], Resource: ["users/*"] }],
    }
    expect(evaluate("users:Read", [scoped], "users/123")).toBe(true)
    expect(evaluate("users:Read", [scoped], "roles/admin")).toBe(false)
  })
})

describe("ability", () => {
  it("grants access from flat permissions", () => {
    const { can } = ability({ permissions: ["read", "write"] })
    expect(can("read")).toBe(true)
    expect(can("write")).toBe(true)
    expect(can("delete")).toBe(false)
  })

  it("grants access from structured policies", () => {
    const { can } = ability({
      policies: [{ Version: "1", Statement: [{ Effect: "Allow", Action: ["users:Read"] }] }],
    })
    expect(can("users:Read")).toBe(true)
    expect(can("users:Write")).toBe(false)
  })

  it("deny overrides in ability", () => {
    const { can } = ability({
      policies: [
        { Version: "1", Statement: [{ Effect: "Allow", Action: ["*"] }] },
        { Version: "1", Statement: [{ Effect: "Deny", Action: ["users:Delete"] }] },
      ],
    })
    expect(can("users:Read")).toBe(true)
    expect(can("users:Delete")).toBe(false)
  })

  it("falls back to flat permissions when no policies", () => {
    const { can } = ability({ permissions: ["manage_users"] })
    expect(can("manage_users")).toBe(true)
  })

  it("denies everything for empty role", () => {
    const { can } = ability({ permissions: [] })
    expect(can("users:Read")).toBe(false)
    expect(can("dashboard:Read")).toBe(false)
  })
})

describe("ability with isAdmin", () => {
  it("allows every action when isAdmin is true", () => {
    const { can } = ability({ permissions: [] }, true)
    expect(can("users:Read")).toBe(true)
    expect(can("users:Delete")).toBe(true)
    expect(can("anything:AtAll")).toBe(true)
  })

  it("still denies when isAdmin is false", () => {
    const { can } = ability({ permissions: [] }, false)
    expect(can("users:Read")).toBe(false)
  })

  it("isAdmin overrides an explicit deny", () => {
    const { can } = ability(
      { policies: [{ Version: "1", Statement: [{ Effect: "Deny", Action: ["*"] }] }] },
      true
    )
    expect(can("users:Delete")).toBe(true)
  })
})
