import { test, expect } from "@playwright/test"

test.describe("Server Admin - Block A: top permission", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("sidebar shows every navigation item", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("h1")).toHaveText("Dashboard")
    const sidebar = page.locator("aside")
    for (const label of [
      "Dashboard",
      "Users",
      "Audit Log",
      "API Keys",
      "Reports",
      "Roles",
      "System Health",
      "Settings",
      "Notifications",
      "Profile",
    ]) {
      await expect(sidebar.getByRole("link", { name: label })).toBeVisible()
    }
  })

  test("admin can open users and roles pages", async ({ page }) => {
    await page.goto("/users")
    await expect(page.locator("h1")).toHaveText("Users")
    await page.goto("/roles")
    await expect(page.locator("h1")).toHaveText("Role Management")
  })
})

test.describe("Server Admin - Block B: unmapped OAuth user gets no grants", () => {
  test.use({ storageState: "e2e/.auth/user.json" })

  test("dashboard stays reachable and remains in the sidebar for zero-grant users", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.locator("h1")).toHaveText("Dashboard")
    const sidebar = page.locator("aside")
    await expect(sidebar.getByRole("link", { name: "Users" })).toHaveCount(0)
    await expect(sidebar.getByRole("link", { name: "Dashboard" })).toBeVisible()
    await expect(sidebar.getByRole("link", { name: "Profile" })).toBeVisible()
  })

  test("users route redirects to the 403 page", async ({ page }) => {
    await page.goto("/users")
    await page.waitForURL("**/403")
    await expect(page.getByRole("heading", { name: "Access Forbidden" })).toBeVisible()
  })

  test("users API rejects with 403", async ({ request }) => {
    const res = await request.get("/api/users")
    expect(res.status()).toBe(403)
  })
})

test.describe("Server Admin - Block C: grant round-trip", () => {
  test.use({ storageState: "e2e/.auth/admin.json" })

  test("granting Editor unlocks users for testuser and denial shows an inline card", async ({ page, browser }) => {
    await page.goto("/users")
    await expect(page.locator("h1")).toHaveText("Users")

    const row = page.getByRole("row").filter({ hasText: "testuser@example.com" })
    await expect(row).toBeVisible()
    await row.locator('[aria-haspopup="menu"]').click()
    await page.getByRole("menuitem", { name: /edit user/i }).click()
    await page.locator("#role").click()
    await page.getByRole("option", { name: "Editor" }).click()
    await page.getByText("Save", { exact: true }).click()
    await expect(row.getByRole("cell", { name: "Editor" })).toBeVisible()

    const userContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const userPage = await userContext.newPage()
    await userPage.goto("/login")
    await userPage.getByText("Sign in with Keycloak").click()
    await userPage.waitForURL(/\/realms\/next-zero/, { timeout: 15000 })
    await userPage.locator("#username").fill("testuser")
    await userPage.locator("#password").fill("TestPass123!")
    await userPage.click("#kc-login")
    await userPage.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(userPage.locator("h1")).toHaveText("Dashboard")

    await userPage.goto("/users")
    await expect(userPage.locator("h1")).toHaveText("Users")

    await userPage.getByRole("button", { name: "Create User" }).click()
    await userPage.locator("#name").fill("Forbidden User")
    await userPage.locator("#email").fill("forbidden@test.com")
    await userPage.getByText("Save").click()
    await expect(
      userPage.getByText("You don't have permission to view this content.")
    ).toBeVisible()
    await userContext.close()

    const usersRes = await page.request.get("/api/users")
    expect(usersRes.status()).toBe(200)
    const users = (await usersRes.json()) as { id: string; name: string; email: string; role: string; status: string }[]
    const testUser = users.find((u) => u.email === "testuser@example.com")
    expect(testUser).toBeDefined()
    const revokeRes = await page.request.put(`/api/users/${testUser!.id}`, {
      data: { name: testUser!.name, email: testUser!.email, role: "", status: testUser!.status },
    })
    expect(revokeRes.status()).toBe(200)
  })
})
