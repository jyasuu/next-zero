import { test, expect, type Page, type APIRequestContext } from "@playwright/test"

const unique = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1000)}`

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

async function createRequest(request: APIRequestContext, title: string): Promise<string> {
  const created = await request.post("/api/requests", {
    data: { title, access: "Staging", justification: "QA access" },
  })
  expect(created.status()).toBe(201)
  return ((await created.json()) as { id: string }).id
}

test.describe("Access requests", () => {
  test.describe("viewer", () => {
    test.use({ storageState: "e2e/.auth/viewer.json" })

    test("creates a request, sees it pending with no decision controls, then cancels it", async ({ page }) => {
      const title = unique()
      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")

      await page.locator("#request-title").fill(title)
      await page.locator("#request-access").fill("Prod database read-only")
      await page.locator("#request-justification").fill("On-call support")
      await page.getByRole("button", { name: "Submit request" }).click()

      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Pending")
      await expect(row.getByRole("button", { name: "Cancel" })).toBeVisible()
      await expect(row.getByRole("button", { name: "Approve" })).toHaveCount(0)
      await expect(row.getByRole("button", { name: "Reject" })).toHaveCount(0)

      await row.getByRole("button", { name: "Cancel" }).click()
      await expect(row).toContainText("Cancelled")
    })

    test("cannot approve a request", async ({ request }) => {
      const title = unique()
      const created = await request.post("/api/requests", {
        data: { title, access: "X", justification: "Y" },
      })
      expect(created.status()).toBe(201)
      const id = ((await created.json()) as { id: string }).id

      const decision = await request.post(`/api/requests/${id}/decision`, {
        data: { action: "approve" },
      })
      expect(decision.status()).toBe(403)
    })
  })

  test.describe("admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" })

    test("approves a request and blocks illegal transitions", async ({ page, request }) => {
      const title = unique()
      const id = await createRequest(request, title)

      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")

      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Pending")

      await row.getByRole("button", { name: "Approve" }).click()
      await expect(row).toContainText("Approved")
      await expect(row.getByRole("button", { name: "Approve" })).toHaveCount(0)

      const again = await request.post(`/api/requests/${id}/decision`, {
        data: { action: "approve" },
      })
      expect(again.status()).toBe(409)
    })

    test("rejects with a comment and reopens", async ({ page, request }) => {
      const title = unique()
      const id = await createRequest(request, title)

      const rejected = await request.post(`/api/requests/${id}/decision`, {
        data: { action: "reject", comment: "Not needed right now" },
      })
      expect(rejected.status()).toBe(200)

      await page.goto("/requests")
      const row = page.getByRole("row").filter({ hasText: title })
      await expect(row).toContainText("Rejected")
      await expect(row).toContainText("Not needed right now")

      await row.getByRole("button", { name: "Reopen" }).click()
      await expect(row).toContainText("Pending")
    })

    test("AI chat files a request with approval and lists requests", async ({ page, request }) => {
      await page.goto("/requests")
      await expect(page.locator("h1")).toHaveText("Access Requests")
      await openWidget(page)
      await ask(page, "Create an access request")
      await expect(page.getByText("Awaiting your approval")).toBeVisible()
      await page.locator("div.fixed.bottom-24.left-6").getByRole("button", { name: "Approve" }).click()
      await expect(page.locator("div.fixed.bottom-24.left-6").getByText("Completed").first()).toBeVisible()

      const created = await request.get("/api/requests")
      expect(created.status()).toBe(200)
      const rows = (await created.json()) as { title: string; status: string }[]
      const mock = rows.filter((r) => r.title === "Mock title")
      expect(mock.length).toBeGreaterThan(0)
      expect(mock[0].status).toBe("pending")

      await page.reload()
      const row = page.getByRole("row").filter({ hasText: "Mock title" }).first()
      await expect(row).toContainText("Pending")

      await openWidget(page)
      await ask(page, "List access requests")
      await expect(
        page.locator("div.fixed.bottom-24.left-6").getByText("Mock title").first()
      ).toBeVisible()
    })
  })
})
