import { test, expect, type Page } from "@playwright/test"

async function setLocale(page: Page) {
  await page.context().addCookies([{ name: "NEXT_LOCALE", value: "en", path: "/", domain: "localhost" }])
}

test.describe("Authentication", () => {
  test("redirects to login when unauthenticated", async ({ page }) => {
    await setLocale(page)
    await page.goto("/dashboard")
    await page.waitForURL("**/login")
    expect(page.url()).toContain("/login")
  })

  test("shows login page", async ({ page }) => {
    await setLocale(page)
    await page.goto("/login")
    await expect(page.locator("h1")).toHaveText("Enterprise App")
    await expect(page.getByText("Sign in with GitHub")).toBeVisible()
  })
})

test.describe("Navigation", () => {
  test("login page renders correctly", async ({ page }) => {
    await setLocale(page)
    await page.goto("/login")
    await expect(page.locator("h1")).toHaveText("Enterprise App")
  })
})
