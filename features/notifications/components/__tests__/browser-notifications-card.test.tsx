import React from "react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import enMessages from "@/messages/en.json"
import { BrowserNotificationsCard } from "@/features/notifications/components/browser-notifications-card"
import { PREFERENCES_KEY } from "@/features/notifications/lib/preferences"
import {
  MockNotification,
  enableEverything,
  resetNotificationMocks,
} from "@/features/notifications/__tests__/notification-mock"

function renderCard() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <BrowserNotificationsCard />
    </NextIntlClientProvider>
  )
}

describe("BrowserNotificationsCard", () => {
  beforeEach(() => {
    resetNotificationMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders the enable toggle, category options, and test button", () => {
    renderCard()
    expect(screen.getByText("Browser notifications")).not.toBeNull()
    expect(screen.getByRole("switch")).not.toBeNull()
    expect(screen.getByRole("checkbox", { name: "Assistant finished" })).not.toBeNull()
    expect(screen.getByRole("checkbox", { name: "System alerts" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "Send a test notification" })).not.toBeNull()
  })

  it("shows the unsupported state and disables controls when the API is missing", () => {
    vi.stubGlobal("Notification", undefined)
    renderCard()
    expect(screen.getByText("This browser does not support notifications.")).not.toBeNull()
    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole("button", { name: "Send a test notification" }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("enables only after permission resolves granted", async () => {
    renderCard()
    fireEvent.click(screen.getByRole("switch"))
    await waitFor(() => {
      expect((screen.getByRole("switch") as HTMLButtonElement).getAttribute("data-state")).toBe("checked")
    })
    expect(screen.getByText("Notifications are enabled.")).not.toBeNull()
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null")
    expect(stored.enabled).toBe(true)
  })

  it("stays disabled when permission is denied", async () => {
    MockNotification.requestPermission = () => Promise.resolve("denied")
    renderCard()
    fireEvent.click(screen.getByRole("switch"))
    await waitFor(() => {
      expect(screen.getByText("Notifications are blocked in your browser settings.")).not.toBeNull()
    })
    expect((screen.getByRole("switch") as HTMLButtonElement).getAttribute("data-state")).toBe("unchecked")
    expect(window.localStorage.getItem(PREFERENCES_KEY)).toBeNull()
  })

  it("sends one test notification per enabled category", () => {
    enableEverything()
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Send a test notification" }))
    expect(MockNotification.instances).toHaveLength(2)
    for (const instance of MockNotification.instances) {
      expect(instance.title).toBe("Test notification")
    }
  })

  it("persists a category toggle through the checkbox", () => {
    enableEverything()
    renderCard()
    fireEvent.click(screen.getByRole("checkbox", { name: "Assistant finished" }))
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? "null")
    expect(stored.categories.chat).toBe(false)
  })

  it("sends no test notifications when every category is off", () => {
    MockNotification.permission = "granted"
    window.localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify({ enabled: true, categories: { chat: false, system: false } })
    )
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: "Send a test notification" }))
    expect(MockNotification.instances).toHaveLength(0)
  })
})
