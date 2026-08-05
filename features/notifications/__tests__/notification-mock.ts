import { vi } from "vitest"
import { PREFERENCES_KEY } from "@/features/notifications/lib/preferences"

export class MockNotification {
  static permission: NotificationPermission = "default"
  static requestPermission: () => Promise<NotificationPermission> = () => Promise.resolve("granted")
  static instances: Array<{ title: string; options?: NotificationOptions }> = []
  constructor(title: string, options?: NotificationOptions) {
    MockNotification.instances.push({ title, options })
  }
}

export function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  })
}

export function resetNotificationMocks() {
  window.localStorage.clear()
  MockNotification.permission = "default"
  MockNotification.requestPermission = () => Promise.resolve("granted")
  MockNotification.instances = []
  vi.stubGlobal("Notification", MockNotification)
}

export function enableEverything() {
  MockNotification.permission = "granted"
  window.localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({ enabled: true, categories: { chat: true, system: true } })
  )
}
