import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL("**/login")
    expect(page.url()).toContain("/login")
  })

  test("shows login page", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h1")).toHaveText("Enterprise App")
    await expect(page.getByText("Sign in with Keycloak")).toBeVisible()
  })

  test("signs in with Keycloak", async ({ page }) => {
    await page.goto("/login")
    await page.getByText("Sign in with Keycloak").click()

    // Should redirect to Keycloak login
    await page.waitForURL(/\/realms\/next-zero/, { timeout: 15000 })
    await expect(page.locator("#username")).toBeVisible({ timeout: 10000 })

    // Fill in credentials
    await page.fill("#username", "testuser")
    await page.fill("#password", "TestPass123!")
    await page.click("#kc-login")

    // Should redirect back to dashboard
    await page.waitForURL("**/dashboard", { timeout: 15000 })
    await expect(page.locator("h1")).toHaveText("Dashboard")
  })
})
