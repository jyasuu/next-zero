import { test, expect } from "@playwright/test"

test.describe("Sidebar navigation", () => {
  test.describe("as viewer", () => {
    test.use({ storageState: "e2e/.auth/viewer.json" })

    test("shows only permitted pages in labeled sections", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page.locator("h1")).toHaveText("Dashboard")

      const aside = page.locator("aside")
      await expect(aside.getByRole("link", { name: "Dashboard" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Chat" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Users" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Requests" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Roles" })).toHaveCount(0)
      await expect(aside.getByRole("link", { name: "API Keys" })).toHaveCount(0)
      await expect(aside.getByRole("link", { name: "System Health" })).toHaveCount(0)

      await expect(aside.locator("p", { hasText: "Management" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Insights" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Settings" })).toBeVisible()
    })

    test("marks the active page", async ({ page }) => {
      await page.goto("/requests")
      await expect(page.locator("h1").first()).toHaveText("Access Requests")
      const active = page.locator("aside nav a[aria-current='page']")
      await expect(active).toHaveText("Requests")
    })
  })

  test.describe("as admin", () => {
    test.use({ storageState: "e2e/.auth/admin.json" })

    test("sees every page in labeled sections", async ({ page }) => {
      await page.goto("/dashboard")
      const aside = page.locator("aside")
      for (const name of [
        "Users",
        "Roles",
        "Requests",
        "API Keys",
        "Audit Log",
        "Reports",
        "System Health",
        "Settings",
        "Notifications",
        "Profile",
      ]) {
        await expect(aside.getByRole("link", { name })).toBeVisible()
      }
      await expect(aside.locator("p", { hasText: "Overview" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Management" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Insights" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Settings" })).toBeVisible()
    })

    test("collapsed rail shows one icon per section and opens a flyout", async ({ page }) => {
      await page.goto("/dashboard")
      await page.getByRole("button", { name: /collapse/i }).click()

      const rail = page.locator("aside")
      await expect(rail.locator("a[aria-label='Management']")).toBeVisible()
      await expect(rail.getByRole("link", { name: "Roles", exact: true })).toHaveCount(0)

      await rail.locator("a[aria-label='Management']").hover()
      const flyout = page.getByRole("menu")
      await expect(flyout.getByRole("link", { name: "Roles", exact: true })).toBeVisible()
      await expect(flyout.getByRole("link", { name: "Requests", exact: true })).toBeVisible()

      await flyout.getByRole("link", { name: "Roles", exact: true }).click()
      await expect(page.locator("h1")).toHaveText("Role Management")
    })
  })

  test.describe("as auditor", () => {
    test.use({ storageState: "e2e/.auth/auditor.json" })

    test("hides sections with no permitted pages", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page.locator("h1")).toHaveText("Dashboard")

      const aside = page.locator("aside")
      await expect(aside.locator("p", { hasText: "Overview" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Insights" })).toBeVisible()
      await expect(aside.locator("p", { hasText: "Management" })).toHaveCount(0)
      await expect(aside.locator("p", { hasText: "Settings" })).toBeVisible()

      await expect(aside.getByRole("link", { name: "Audit Log" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Reports" })).toBeVisible()
      await expect(aside.getByRole("link", { name: "Users" })).toHaveCount(0)
    })
  })

  test.describe("mobile drawer", () => {
    test.use({ storageState: "e2e/.auth/viewer.json", viewport: { width: 390, height: 844 } })

    test("opens from the hamburger and navigates", async ({ page }) => {
      await page.goto("/dashboard")
      await expect(page.locator("aside")).not.toBeVisible()

      await page.getByRole("button", { name: /menu/i }).click()
      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Management", { exact: true })).toBeVisible()
      await dialog.getByRole("link", { name: "Requests" }).click()

      await expect(page.locator("h1").first()).toHaveText("Access Requests")
      await expect(page.getByRole("dialog")).toHaveCount(0)
    })
  })
})
