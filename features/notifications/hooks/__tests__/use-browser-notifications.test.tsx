import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import type { UIMessage } from "ai"
import { useBrowserNotifications, type ChatTurnStrings } from "@/features/notifications/hooks/use-browser-notifications"
import { DEFAULT_PREFERENCES, PREFERENCES_KEY } from "@/features/notifications/lib/preferences"
import {
  MockNotification,
  enableEverything,
  resetNotificationMocks,
  setDocumentHidden,
} from "@/features/notifications/__tests__/notification-mock"

const strings: ChatTurnStrings = {
  finishedTitle: "Assistant replied",
  finishedBody: "Assistant finished",
  waitingTitle: "Action needed",
  waitingBody: "Waiting for approval",
}

const assistantFinished = (): UIMessage => ({
  id: "a1",
  role: "assistant",
  parts: [{ type: "text", text: "Done" }],
})

describe("useBrowserNotifications", () => {
  beforeEach(() => {
    resetNotificationMocks()
    setDocumentHidden(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setDocumentHidden(false)
  })

  it("starts disabled with default preferences", () => {
    const { result } = renderHook(() => useBrowserNotifications())
    expect(result.current.supported).toBe(true)
    expect(result.current.permission).toBe("default")
    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES)
  })

  it("requests permission and records the granted state", async () => {
    const { result } = renderHook(() => useBrowserNotifications())
    await act(async () => {
      await result.current.requestPermission()
    })
    expect(result.current.permission).toBe("granted")
  })

  it("persists preference changes to localStorage", () => {
    const { result } = renderHook(() => useBrowserNotifications())
    act(() => result.current.setEnabled(true))
    expect(result.current.preferences.enabled).toBe(true)
    act(() => result.current.setCategoryEnabled("chat", false))
    expect(result.current.preferences.categories.chat).toBe(false)
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null")
    expect(stored).toEqual({ enabled: true, categories: { chat: false, system: true } })
  })

  it("refuses to notify while disabled", () => {
    const { result } = renderHook(() => useBrowserNotifications())
    expect(result.current.notify("chat", { title: "Hi" })).toBe(false)
    expect(MockNotification.instances).toHaveLength(0)
  })

  it("shows a notification when everything is allowed", () => {
    enableEverything()
    const { result } = renderHook(() => useBrowserNotifications())
    const ok = result.current.notify("chat", { title: "Hi", body: "Body" })
    expect(ok).toBe(true)
    expect(MockNotification.instances).toEqual([{ title: "Hi", options: { body: "Body" } }])
  })

  it("refuses a chat-turn notification while the tab is visible", () => {
    enableEverything()
    setDocumentHidden(false)
    const { result } = renderHook(() => useBrowserNotifications())
    expect(result.current.notifyChatTurnFinished([assistantFinished()], [], strings)).toBe(false)
    expect(MockNotification.instances).toHaveLength(0)
  })

  it("shows a chat-turn notification with the finished payload while the tab is hidden", () => {
    enableEverything()
    setDocumentHidden(true)
    const { result } = renderHook(() => useBrowserNotifications())
    const ok = result.current.notifyChatTurnFinished([assistantFinished()], [], strings)
    expect(ok).toBe(true)
    expect(MockNotification.instances).toEqual([{ title: "Assistant replied", options: { body: "Done" } }])
  })

  it("shows an awaiting-approval notification for a pending write tool", () => {
    enableEverything()
    setDocumentHidden(true)
    const { result } = renderHook(() => useBrowserNotifications())
    const pending: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        {
          type: "tool-users_create",
          toolCallId: "call_1",
          toolName: "users_create",
          state: "input-available",
          input: { name: "Ada" },
        },
      ] as never,
    }
    const tools = [{ id: "users_create", approval: "always" } as never]
    const ok = result.current.notifyChatTurnFinished([pending], tools, strings)
    expect(ok).toBe(true)
    expect(MockNotification.instances).toEqual([{ title: "Action needed", options: { body: "Waiting for approval" } }])
  })
})
