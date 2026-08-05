import { describe, it, expect } from "vitest"
import { shouldNotify, type ShouldNotifyInput } from "@/features/notifications/lib/policy"
import { DEFAULT_PREFERENCES } from "@/features/notifications/lib/preferences"

function base(overrides: Partial<ShouldNotifyInput> = {}): ShouldNotifyInput {
  return {
    supported: true,
    permission: "granted",
    preferences: { ...DEFAULT_PREFERENCES, enabled: true },
    category: "chat",
    documentHidden: false,
    requireHidden: false,
    ...overrides,
  }
}

describe("shouldNotify", () => {
  it("allows a background chat event when everything is in order", () => {
    expect(shouldNotify(base({ documentHidden: true, requireHidden: true }))).toBe(true)
  })

  it("allows a user-gesture notification even while the tab is visible", () => {
    expect(shouldNotify(base({ documentHidden: false }))).toBe(true)
  })

  it("rejects when the browser does not support notifications", () => {
    expect(shouldNotify(base({ supported: false }))).toBe(false)
  })

  it("rejects when permission has not been granted", () => {
    expect(shouldNotify(base({ permission: "default" }))).toBe(false)
    expect(shouldNotify(base({ permission: "denied" }))).toBe(false)
  })

  it("rejects when the feature is disabled", () => {
    expect(shouldNotify(base({ preferences: { ...DEFAULT_PREFERENCES, enabled: false } }))).toBe(false)
  })

  it("rejects when the category toggle is off", () => {
    const preferences = {
      enabled: true,
      categories: { chat: false, system: true },
    }
    expect(shouldNotify(base({ preferences }))).toBe(false)
  })

  it("rejects a background event while the tab is visible", () => {
    expect(shouldNotify(base({ documentHidden: false, requireHidden: true }))).toBe(false)
  })
})
