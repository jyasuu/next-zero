import { test, expect, type Page } from "@playwright/test"

const WIDGET = "div.fixed.bottom-24.left-6"

async function openWidget(page: Page) {
  const input = page.getByPlaceholder("Ask anything...")
  if (await input.isVisible().catch(() => false)) return
  await page.getByRole("button", { name: "Toggle chat" }).click()
  await expect(input).toBeVisible()
}

async function ask(page: Page, text: string) {
  await page.getByPlaceholder("Ask anything...").fill(text)
  await page.getByRole("button", { name: "Send message" }).click()
}

test.describe("AI form-fill and state sync", () => {
  test.describe("admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" })

    test("form-fill reports a valid form for free-text fields", async ({ page }) => {
      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")
      await openWidget(page)
      await ask(page, "Fill the access request form")

      await expect(page.locator(WIDGET).getByText("Valid").first()).toBeVisible()
      await expect(page.locator(WIDGET).getByText("No field errors").first()).toBeVisible()
      await expect(page.locator(WIDGET).getByText("Mock title").first()).toBeVisible()
      await expect(page.locator(WIDGET).getByText("Awaiting your approval")).toHaveCount(0)
    })

    test("form-fill reports an invalid amount on the expense form", async ({ page }) => {
      await page.goto("/expenses")
      await expect(page.locator("h1")).toHaveText("Expenses")
      await openWidget(page)
      await ask(page, "Fill the expense form")

      await expect(page.locator(WIDGET).getByText("Invalid", { exact: true }).first()).toBeVisible()
      await expect(page.locator(WIDGET).getByText("amount is invalid").first()).toBeVisible()
      await expect(page.locator(WIDGET).getByText("Awaiting your approval")).toHaveCount(0)
    })

    test("Apply to form fills the page inputs", async ({ page }) => {
      await page.goto("/expenses")
      await expect(page.locator("h1")).toHaveText("Expenses")
      await openWidget(page)
      await ask(page, "Fill the expense form")

      await expect(page.locator(WIDGET).getByText("Invalid", { exact: true }).first()).toBeVisible()
      await page.locator(WIDGET).getByRole("button", { name: "Apply to form" }).first().click()

      await expect(page.locator("#expense-title")).toHaveValue("Mock title")
      await expect(page.locator("#expense-amount")).toHaveValue("mock-amount")
      await expect(page.locator("#expense-justification")).toHaveValue("mock-justification")
    })

    test("auto-apply fills the request form when the verdict is valid", async ({ page }) => {
      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")
      await openWidget(page)
      await page.locator(WIDGET).getByRole("switch", { name: "Auto-apply" }).click()
      await ask(page, "Fill the access request form")

      await expect(page.locator(WIDGET).getByText("Valid").first()).toBeVisible()
      await expect(page.locator("#request-title")).toHaveValue("Mock title")
      await expect(page.locator("#request-access")).toHaveValue("mock-access")
      await expect(page.locator("#request-justification")).toHaveValue("mock-justification")
    })

    test("an approved AI create appears in the requests list without a reload", async ({ page }) => {
      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")
      await openWidget(page)
      await ask(page, "Create an access request")

      await expect(page.locator(WIDGET).getByText("Awaiting your approval").first()).toBeVisible()
      await page.locator(WIDGET).getByRole("button", { name: "Approve" }).first().click()
      await expect(page.locator(WIDGET).getByText("Completed").first()).toBeVisible()

      const row = page.getByRole("row").filter({ hasText: "Mock title" }).first()
      await expect(row).toContainText("Pending")
    })
  })
})
