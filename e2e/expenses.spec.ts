import { test, expect, type Page, type APIRequestContext } from "@playwright/test"

const unique = () => `e2e-expense-${Date.now()}-${Math.floor(Math.random() * 1000)}`

async function createExpense(request: APIRequestContext, title: string): Promise<string> {
  const created = await request.post("/api/expenses", {
    data: { title, amount: "120.50", justification: "Business travel" },
  })
  expect(created.status()).toBe(201)
  return ((await created.json()) as { id: string }).id
}

test.describe("Expense claims", () => {
  test.describe("viewer", () => {
    test.use({ storageState: "e2e/.auth/viewer.json" })

    test("files an expense, sees it pending with no decision controls, then cancels it", async ({ page }) => {
      const title = unique()
      await page.goto("/expenses")
      await expect(page.locator("h1")).toHaveText("Expenses")

      await page.locator("#expense-title").fill(title)
      await page.locator("#expense-amount").fill("99.90")
      await page.locator("#expense-justification").fill("Client lunch")
      await page.getByRole("button", { name: "Submit claim" }).click()

      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Pending")
      await expect(row).toContainText("99.90")
      await expect(row.getByRole("button", { name: "Cancel" })).toBeVisible()
      await expect(row.getByRole("button", { name: "Approve" })).toHaveCount(0)
      await expect(row.getByRole("button", { name: "Reject" })).toHaveCount(0)

      await row.getByRole("button", { name: "Cancel" }).click()
      await expect(row).toContainText("Cancelled")
    })

    test("cannot approve an expense", async ({ request }) => {
      const title = unique()
      const id = await createExpense(request, title)

      const decision = await request.post(`/api/expenses/${id}/decision`, {
        data: { action: "approve" },
      })
      expect(decision.status()).toBe(403)
    })
  })

  test.describe("admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" })

    test("approves an expense and blocks illegal transitions", async ({ page, request }) => {
      const title = unique()
      const id = await createExpense(request, title)

      await page.goto("/expenses")
      await expect(page.locator("h1")).toHaveText("Expenses")

      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Pending")

      await row.getByRole("button", { name: "Approve" }).click()
      await expect(row).toContainText("Approved")
      await expect(row.getByRole("button", { name: "Approve" })).toHaveCount(0)

      const again = await request.post(`/api/expenses/${id}/decision`, {
        data: { action: "approve" },
      })
      expect(again.status()).toBe(409)
    })

    test("rejects with a comment and reopens", async ({ page, request }) => {
      const title = unique()
      const id = await createExpense(request, title)

      const rejected = await request.post(`/api/expenses/${id}/decision`, {
        data: { action: "reject", comment: "Missing receipt" },
      })
      expect(rejected.status()).toBe(200)

      await page.goto("/expenses")
      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Rejected")
      await expect(row).toContainText("Missing receipt")

      await row.getByRole("button", { name: "Reopen" }).click()
      await expect(row).toContainText("Pending")
    })
  })
})
