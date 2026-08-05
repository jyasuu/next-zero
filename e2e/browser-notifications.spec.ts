import { test, expect, type BrowserContext } from "@playwright/test"

async function stubBrowserNotifications(context: BrowserContext) {
  await context.addInitScript(() => {
    const calls: Array<{ title: string; body?: string }> = []
    Object.defineProperty(window, "__notificationCalls", { value: calls, configurable: true })

    class FakeNotification {
      static permission: NotificationPermission = "granted"
      static requestPermission(): Promise<NotificationPermission> {
        return Promise.resolve("granted")
      }
      constructor(title: string, options?: NotificationOptions) {
        calls.push({ title, body: options?.body })
      }
    }
    Object.defineProperty(window, "Notification", { value: FakeNotification, configurable: true })

    try {
      window.localStorage.setItem(
        "browser-notifications:prefs",
        JSON.stringify({ enabled: true, categories: { chat: true, system: true } })
      )
    } catch {
      // ignore opaque-origin localStorage during early document load
    }

    Object.defineProperty(document, "hidden", { configurable: true, get: () => true })
  })
}

async function notificationCalls(page: import("@playwright/test").Page) {
  return page.evaluate(() => (window as { __notificationCalls?: Array<{ title: string; body?: string }> }).__notificationCalls ?? [])
}

test.describe("Browser notifications", () => {
  test("fires a browser notification when a chat turn finishes in the background", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/admin.json" })
    await stubBrowserNotifications(context)
    const page = await context.newPage()

    await page.goto("/chat")
    await expect(page.locator("h1")).toHaveText("Chat")
    await page.getByPlaceholder("Ask anything...").fill("Hello there")
    await page.getByRole("button", { name: "Send message" }).click()

    await expect
      .poll(async () => (await notificationCalls(page)).some((call) => call.title === "Assistant replied"), {
        timeout: 15000,
      })
      .toBe(true)

    await context.close()
  })

  test("fires an awaiting-approval notification for a pending write tool", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/admin.json" })
    await stubBrowserNotifications(context)
    const page = await context.newPage()

    await page.goto("/users")
    await expect(page.locator("h1")).toHaveText("Users")
    await page.getByRole("button", { name: "Toggle chat" }).click()
    await page.getByPlaceholder("Ask anything...").fill("Create a user")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByText("Awaiting your approval")).toBeVisible()

    await expect
      .poll(async () => (await notificationCalls(page)).some((call) => call.title === "Action needed"), {
        timeout: 15000,
      })
      .toBe(true)

    await context.close()
  })
})
