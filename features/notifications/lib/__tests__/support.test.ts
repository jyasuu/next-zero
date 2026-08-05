import { describe, it, expect, afterEach, vi } from "vitest"
import {
  isNotificationSupported,
  permissionState,
  requestPermission,
} from "@/features/notifications/lib/support"

describe("notification support", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reports unsupported when the browser has no Notification API", () => {
    vi.stubGlobal("Notification", undefined)
    expect(isNotificationSupported()).toBe(false)
  })

  it("reports supported when Notification exists", () => {
    vi.stubGlobal("Notification", { permission: "granted" })
    expect(isNotificationSupported()).toBe(true)
  })

  it("reads the current permission state", () => {
    vi.stubGlobal("Notification", { permission: "granted" })
    expect(permissionState()).toBe("granted")
  })

  it("treats an unsupported browser as denied", () => {
    vi.stubGlobal("Notification", undefined)
    expect(permissionState()).toBe("denied")
  })

  it("forwards requestPermission to the browser", async () => {
    const request = vi.fn().mockResolvedValue("granted")
    vi.stubGlobal("Notification", { permission: "default", requestPermission: request })
    await expect(requestPermission()).resolves.toBe("granted")
    expect(request).toHaveBeenCalledTimes(1)
  })
})
