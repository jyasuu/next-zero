import { describe, it, expect } from "vitest"
import { realmRolesFromAccessToken } from "@/lib/realm-roles"

function fakeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url").replace(/=+$/, "")
  return `${encode({ alg: "none" })}.${encode(payload)}.${encode({})}`
}

describe("realmRolesFromAccessToken", () => {
  it("extracts realm_access.roles from a JWT payload", () => {
    const token = fakeJwt({ sub: "1", realm_access: { roles: ["editor", "viewer"] } })
    expect(realmRolesFromAccessToken(token)).toEqual(["editor", "viewer"])
  })

  it("returns an empty array when there are no realm roles", () => {
    const token = fakeJwt({ sub: "1", realm_access: { roles: [] } })
    expect(realmRolesFromAccessToken(token)).toEqual([])
  })

  it("returns an empty array when realm_access is missing", () => {
    const token = fakeJwt({ sub: "1" })
    expect(realmRolesFromAccessToken(token)).toEqual([])
  })

  it("returns an empty array for an empty or malformed token", () => {
    expect(realmRolesFromAccessToken("")).toEqual([])
    expect(realmRolesFromAccessToken("not-a-jwt")).toEqual([])
    expect(realmRolesFromAccessToken("a.b")).toEqual([])
  })
})
