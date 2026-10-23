import { test, expect } from "@playwright/test"

// Country page status codes (issue #194).
//
// A known country code renders the page (200), an unknown one must be a real
// 404 and not a 200 "empty" page, because soft 404s hurt indexing. The page
// tolerates an unreachable database (it shows no tournaments), so both tests
// also pass in local runs that use dummy Supabase credentials.
test.use({ baseURL: "http://localhost:3000" })

test.describe("/country/[code]", () => {
  test("a valid country code returns 200 with the country name", async ({ page }) => {
    const response = await page.goto("/country/in")
    expect(response?.status()).toBe(200)
    await expect(page.locator("h1").first()).toContainText("India")
  })

  test("an upper-case code still works", async ({ page }) => {
    const response = await page.goto("/country/IN")
    expect(response?.status()).toBe(200)
  })

  test("an unknown country code returns a real 404", async ({ page }) => {
    const response = await page.goto("/country/zz")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Page Not Found")).toBeVisible()
  })
})
