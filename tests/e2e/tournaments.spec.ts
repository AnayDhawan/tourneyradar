import { test, expect } from "@playwright/test"

// Tournament detail page status codes (issue #208).
//
// An unknown tournament id or an unpublished row must return a real 404
// status code and not a 200 "Tournament Not Found" body, preventing soft 404s
// and wasted crawler budget.
test.use({ baseURL: "http://localhost:3000" })

test.describe("/tournaments/[id]", () => {
  test("an unknown tournament id returns a real 404", async ({ page }) => {
    const response = await page.goto("/tournaments/does-not-exist-123")
    expect(response?.status()).toBe(404)
    await expect(page.getByText("Page Not Found")).toBeVisible()
  })
})
