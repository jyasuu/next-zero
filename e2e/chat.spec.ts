import { test, expect, type Page } from "@playwright/test"

async function openWidget(page: Page) {
  await page.getByRole("button", { name: "Toggle chat" }).click()
}

async function ask(page: Page, text: string) {
  await page.getByPlaceholder("Ask anything...").fill(text)
  await page.getByRole("button", { name: "Send message" }).click()
}

const unique = () => `Hello there ${Date.now()}-${Math.floor(Math.random() * 1000)}`

test.describe("Chat copilot", () => {
  test.describe("admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" })

    test("approved write tool executes and reports success", async ({ page, request }) => {
      await page.goto("/users")
      await expect(page.locator("h1")).toHaveText("Users")
      await openWidget(page)
      await ask(page, "Create a user")
      await expect(page.getByText("Awaiting your approval")).toBeVisible()
      await page.getByRole("button", { name: "Approve" }).click()
      await expect(page.getByText("The action was completed successfully.")).toBeVisible()

      const users = (await (await request.get("/api/users")).json()) as {
        id: string
        email: string
      }[]
      const created = users.find((u) => u.email === "mock@example.com")
      if (created) {
        await request.delete(`/api/users/${created.id}`)
      }
    })

    test("denied write tool produces a refusal message", async ({ page }) => {
      await page.goto("/users")
      await expect(page.locator("h1")).toHaveText("Users")
      await openWidget(page)
      await ask(page, "Delete a user")
      await expect(page.getByText("Awaiting your approval")).toBeVisible()
      await page.getByRole("button", { name: "Deny" }).click()
      await expect(
        page.getByText(/The requested action was refused: The user denied/)
      ).toBeVisible()
    })

    test("read tool auto-executes without approval", async ({ page }) => {
      await page.goto("/users")
      await expect(page.locator("h1")).toHaveText("Users")
      await openWidget(page)
      await ask(page, "List all users")
      await expect(page.getByText("The action was completed successfully.")).toBeVisible()
    })

    test("/chat page exposes only global tools", async ({ page }) => {
      await page.goto("/chat")
      await expect(page.locator("h1")).toHaveText("Chat")
      await ask(page, "Who am I?")
      await expect(page.getByText("The action was completed successfully.")).toBeVisible()

      await page.getByRole("button", { name: "New chat" }).click()
      await ask(page, "Create a user")
      await expect(
        page.getByText(/I have no tool available for that request/)
      ).toBeVisible()
    })

    test("sessions persist, resume, and soft-delete", async ({ page }) => {
      const title = unique()
      await page.goto("/chat")
      await expect(page.locator("h1")).toHaveText("Chat")
      await ask(page, title)
      await expect(page.getByText("The action was completed successfully.")).toBeVisible()

      await page.reload()
      await expect(page.locator("h1")).toHaveText("Chat")
      await expect(page.getByRole("combobox", { name: "Select a conversation" })).toContainText(title)

      await page.getByRole("button", { name: "New chat" }).click()
      await expect(page.getByRole("combobox", { name: "Select a conversation" })).toContainText("New chat")
      await expect(page.getByText("How can I help you?")).toBeVisible()

      await page.getByRole("combobox", { name: "Select a conversation" }).click()
      await page.getByRole("option", { name: title }).click()
      await expect(page.getByText("The action was completed successfully.")).toBeVisible()

      await page.getByRole("button", { name: "Delete conversation" }).click()
      await expect(page.getByRole("combobox", { name: "Select a conversation" })).toContainText("New chat")
      await page.getByRole("combobox", { name: "Select a conversation" }).click()
      await expect(page.getByRole("option", { name: title })).toHaveCount(0)
    })
  })

  test.describe("viewer", () => {
    test.use({ storageState: "e2e/.auth/viewer.json" })

    test("approved write that exceeds grants is refused with a 403", async ({ page }) => {
      await page.goto("/users")
      await expect(page.locator("h1")).toHaveText("Users")
      await openWidget(page)
      await ask(page, "Create a user")
      await expect(page.getByText("Awaiting your approval")).toBeVisible()
      await page.getByRole("button", { name: "Approve" }).click()
      await expect(page.getByText(/The requested action was refused: Forbidden/)).toBeVisible()
    })
  })
})
