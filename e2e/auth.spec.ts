import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard")
    // Dashboard layout redirects unauthenticated users to /login
    await page.waitForURL("**/login")
    expect(page.url()).toContain("/login")
  })

  test("shows login page", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h1")).toHaveText("Welcome back")
    await expect(page.getByText("Sign in with GitHub")).toBeVisible()
  })
})

test.describe("Navigation", () => {
  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("h1")).toHaveText("Welcome back")
  })
})
