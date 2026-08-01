import { test, expect } from "@playwright/test"

test.describe("Chat disabled state", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("renders the disabled message when the chat API is unavailable", async ({ page }) => {
    await page.route("**/api/chat/sessions", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "AI chat is disabled" }),
      })
    )
    await page.goto("/chat")
    await expect(page.locator("h1")).toHaveText("Chat")
    await expect(page.getByText(/Chat is disabled/)).toBeVisible()
  })
})
