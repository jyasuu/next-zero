import { test as setup, expect } from "@playwright/test"

const AUTH_FILE = "e2e/.auth/viewer.json"

setup("authenticate viewer with Keycloak", async ({ page }) => {
  await page.goto("/login")
  await page.getByText("Sign in with Keycloak").click()
  await page.waitForURL(/\/realms\/next-zero/, { timeout: 15000 })
  await expect(page.locator("#username")).toBeVisible({ timeout: 10000 })
  await page.fill("#username", "vieweruser")
  await page.fill("#password", "TestPass123!")
  await page.click("#kc-login")
  await page.waitForURL("**/dashboard", { timeout: 15000 })
  await expect(page.locator("h1")).toHaveText("Dashboard")
  await page.context().storageState({ path: AUTH_FILE })
})
