import { describe, it, expect } from "vitest"
import { mapRealmRoles } from "@/lib/role-mapping"

describe("mapRealmRoles", () => {
  const mapping = JSON.stringify({ admin: "Admin", editor: "Editor", viewer: "Viewer" })

  it("maps a matched realm role to an app role", () => {
    expect(mapRealmRoles(["editor"], mapping)).toBe("Editor")
  })

  it("returns the first matching realm role in order", () => {
    expect(mapRealmRoles(["viewer", "admin"], mapping)).toBe("Viewer")
  })

  it("resolves to null when no realm role matches", () => {
    expect(mapRealmRoles(["developer"], mapping)).toBeNull()
  })

  it("resolves to null when there are no realm roles", () => {
    expect(mapRealmRoles([], mapping)).toBeNull()
  })

  it("resolves to null when mapping is undefined", () => {
    expect(mapRealmRoles(["admin"], undefined)).toBeNull()
  })

  it("resolves to null when mapping JSON is malformed", () => {
    expect(mapRealmRoles(["admin"], "{not json")).toBeNull()
  })
})
