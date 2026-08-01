import { test, expect } from "@playwright/test"

test.use({ storageState: "e2e/.auth/admin.json" })

test.describe("Page user stories", () => {
  test("dashboard shows key metrics at a glance", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("h1")).toHaveText("Dashboard")
    await expect(page.getByText("12,483")).toBeVisible()
    await expect(page.getByText("$284,500")).toBeVisible()
    await expect(page.getByText("Users Overview")).toBeVisible()
    await expect(page.getByText("API Requests")).toBeVisible()
    await expect(page.getByText("Recent Activity")).toBeVisible()
  })

  test("users table can be searched and paginated", async ({ page }) => {
    await page.goto("/users")
    await expect(page.locator("h1")).toHaveText("Users")
    const rows = page.locator("table tbody tr")
    await expect(rows).toHaveCount(10)
    const search = page.getByPlaceholder("Search users...")
    await search.fill("Alice")
    await expect(rows).toHaveCount(1)
    await expect(page.getByRole("cell", { name: "Alice Johnson" })).toBeVisible()
    await search.clear()
    await page.getByRole("button", { name: "Next" }).click()
    const secondPageCount = await rows.count()
    expect(secondPageCount).toBeGreaterThan(0)
    expect(secondPageCount).toBeLessThanOrEqual(10)
  })

  test("settings tabs switch between content panels", async ({ page }) => {
    await page.goto("/settings")
    await expect(page.locator("h1")).toHaveText("Settings")
    await expect(page.getByRole("tab", { name: "General" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Notifications" })).toBeVisible()

    await page.getByRole("tab", { name: "Appearance" }).click()
    await expect(page.getByText("Dark Mode", { exact: true })).toBeVisible()

    await page.getByRole("tab", { name: "Notifications" }).click()
    await expect(page.getByText("Email Notifications", { exact: true })).toBeVisible()
  })

  test("profile form is pre-filled with user data", async ({ page }) => {
    await page.goto("/profile")
    await expect(page.locator("h1")).toHaveText("Profile")
    await expect(page.locator("#firstName")).toHaveValue("John")
    await expect(page.locator("#lastName")).toHaveValue("Doe")
    await expect(page.locator("#email")).toHaveValue("john@example.com")
    await expect(page.locator("#currentPassword")).toBeVisible()
    await expect(page.locator("#newPassword")).toBeVisible()
  })

  test("notifications show unread items", async ({ page }) => {
    await page.goto("/notifications")
    await expect(page.locator("h1")).toHaveText("Notifications")
    await expect(page.getByText(/new user registered/i)).toBeVisible()
    await expect(page.getByText(/unread notifications/i)).toBeVisible()
  })

  test("audit log table pages through results", async ({ page }) => {
    await page.goto("/audit-log")
    await expect(page.locator("h1")).toHaveText("Audit Log")
    const rows = page.locator("table tbody tr")
    await expect(rows).toHaveCount(10)
    await page.getByRole("button", { name: "Next" }).click()
    await expect(rows).toHaveCount(10)
    await page.getByRole("button", { name: "Previous" }).click()
    await expect(rows.first()).toBeVisible()
  })
})

test.describe("Users CRUD", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("creates, edits, and deletes a user", async ({ page }) => {
    await page.goto("/users")
    await expect(page.locator("h1")).toHaveText("Users")

    // Create
    await page.getByRole("button", { name: "Create User" }).click()
    await page.locator("#name").fill("E2E Test User")
    await page.locator("#email").fill("e2e@test.com")
    await page.getByText("Save").click()
    await expect(page.getByRole("cell", { name: "E2E Test User" })).toBeVisible()

    // Edit
    const row = page.getByRole("row").filter({ hasText: "E2E Test User" })
    await row.locator('[aria-haspopup="menu"]').click()
    await page.getByRole("menuitem", { name: /edit user/i }).click()
    await page.locator("#name").fill("E2E User Updated")
    await page.getByText("Save").click()
    await expect(page.getByRole("cell", { name: "E2E User Updated" })).toBeVisible()

    // Delete
    const updatedRow = page.getByRole("row").filter({ hasText: "E2E User Updated" })
    await updatedRow.locator('[aria-haspopup="menu"]').click()
    await page.getByRole("menuitem", { name: /delete user/i }).click()
    await page.getByRole("dialog").getByRole("button", { name: /delete/i }).click()
    await expect(page.getByRole("cell", { name: "E2E User Updated" })).toHaveCount(0)
  })
})

test.describe("Roles CRUD", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("creates, edits, and deletes a role", async ({ page }) => {
    await page.goto("/roles")
    await expect(page.locator("h1")).toHaveText("Role Management")

    // Create
    await page.getByRole("button", { name: "Create Role" }).click()
    await page.locator("#roleName").fill("E2E Role")
    await page.locator("#roleDesc").fill("Created in e2e test")
    await page.locator('[id="perm-dashboard:Read"]').check()
    await page.locator('[id="perm-users:Read"]').check()
    await page.getByRole("button", { name: "Save Role" }).click()
    await expect(page.getByRole("row").filter({ hasText: "E2E Role" })).toBeVisible()

    // Edit
    await page.getByRole("button", { name: /edit role/i }).first().click()
    await page.locator("#roleName").fill("E2E Role Updated")
    await page.getByRole("button", { name: "Save Role" }).click()
    await expect(page.getByRole("cell", { name: "E2E Role Updated" })).toBeVisible()

    // Delete
    await page.getByRole("button", { name: /delete role/i }).first().click()
    await page.getByRole("dialog").getByRole("button", { name: /delete/i }).click()
    await expect(page.getByRole("cell", { name: "E2E Role Updated" })).toHaveCount(0)
  })
})
