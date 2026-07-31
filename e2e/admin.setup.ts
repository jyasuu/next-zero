import { test as setup, expect } from "@playwright/test"

const AUTH_FILE = "e2e/.auth/admin.json"

setup("authenticate as built-in admin", async ({ page }) => {
  await page.goto("/login")
  await page.getByPlaceholder("Username").fill("admin")
  await page.getByPlaceholder("Password").fill("admin")
  await page.getByRole("button", { name: "Sign In", exact: true }).click()
  await page.waitForURL("**/dashboard", { timeout: 15000 })
  await expect(page.locator("h1")).toHaveText("Dashboard")
  await page.context().storageState({ path: AUTH_FILE })
})
