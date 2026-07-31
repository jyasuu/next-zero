import { describe, expect, it } from "vitest"
import { isAdminLoginEnabled } from "@/lib/admin-login"

describe("isAdminLoginEnabled", () => {
  it("enabled when credentials are set and flag is unset", () => {
    expect(isAdminLoginEnabled({ ADMIN_USERNAME: "admin", ADMIN_PASSWORD: "admin" })).toBe(true)
  })

  it("enabled when credentials are set and flag is true", () => {
    expect(
      isAdminLoginEnabled({
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "admin",
        ADMIN_LOGIN_ENABLED: "true",
      })
    ).toBe(true)
  })

  it("disabled when flag is false even with credentials", () => {
    expect(
      isAdminLoginEnabled({
        ADMIN_USERNAME: "admin",
        ADMIN_PASSWORD: "admin",
        ADMIN_LOGIN_ENABLED: "false",
      })
    ).toBe(false)
  })

  it("disabled when credentials are missing", () => {
    expect(isAdminLoginEnabled({})).toBe(false)
    expect(isAdminLoginEnabled({ ADMIN_USERNAME: "admin" })).toBe(false)
    expect(isAdminLoginEnabled({ ADMIN_LOGIN_ENABLED: "true" })).toBe(false)
  })
})
