import { test, expect, type Page } from "@playwright/test"

// Mobile menu drawer is a modal dialog (issue #220).
//
// The login page mounts the drawer itself (not through BaseLayout), which is
// the case that used to leave the page behind the drawer scrollable.
test.use({ baseURL: "http://localhost:3000", viewport: { width: 390, height: 844 } })

// Clicking before React hydrates does nothing, so wait until the button has its handlers.
async function openLogin(page: Page) {
  await page.goto("/player/login")
  await page.waitForFunction(() => {
    const button = document.querySelector(".mobile-menu-btn")
    return !!button && Object.keys(button).some((key) => key.startsWith("__reactProps"))
  })
}

test.describe("mobile nav drawer", () => {
  test("opens as a labelled dialog and focuses the close button", async ({ page }) => {
    await openLogin(page)
    await page.getByRole("button", { name: "Open menu" }).click()

    const dialog = page.getByRole("dialog", { name: "Main menu" })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused()
  })

  test("Escape closes it and focus returns to the menu button", async ({ page }) => {
    await openLogin(page)
    const menuButton = page.getByRole("button", { name: "Open menu" })
    await menuButton.click()
    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeVisible()

    await page.keyboard.press("Escape")

    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeHidden()
    await expect(menuButton).toBeFocused()
  })

  test("Tab and Shift+Tab stay inside the drawer", async ({ page }) => {
    await openLogin(page)
    await page.getByRole("button", { name: "Open menu" }).click()
    const dialog = page.getByRole("dialog", { name: "Main menu" })
    await expect(dialog).toBeVisible()

    const insideDialog = () => page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab")
      expect(await insideDialog()).toBe(true)
    }
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Shift+Tab")
      expect(await insideDialog()).toBe(true)
    }
  })

  test("locks page scroll while open and releases it on close", async ({ page }) => {
    await openLogin(page)
    const overflow = () => page.evaluate(() => document.body.style.overflow)
    expect(await overflow()).toBe("")

    await page.getByRole("button", { name: "Open menu" }).click()
    expect(await overflow()).toBe("hidden")

    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog", { name: "Main menu" })).toBeHidden()
    expect(await overflow()).toBe("")
  })
})
