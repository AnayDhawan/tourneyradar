import { test, expect, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { existsSync } from "node:fs"

// Same as auth-persistence.spec.ts: the test process does not load .env.local
// on its own, and the file does not exist in CI (the workflow sets the vars).
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local")
}

// Accessibility pass with axe-core (issue #283).
//
// Each main page is scanned in the light and the dark theme and must have no
// serious or critical violations. Moderate and minor findings are reported in
// the test output but do not fail the run. No rule is disabled.
//
// The theme is the `theme` localStorage key that lib/theme.ts reads; it sets
// `data-theme` on <html>. Seeding it before the page loads means the scan sees
// the same markup a returning visitor with that preference would.

type Theme = "light" | "dark"
const THEMES: Theme[] = ["light", "dark"]

async function openAs(page: Page, theme: Theme, path: string) {
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme)
  // Transitions and animations leave colours half way between two values when
  // axe samples them, which reads as false contrast failures.
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: theme })
  const response = await page.goto(path)
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
  await page.waitForLoadState("networkidle")
  return response
}

// /submit shows the form only to a signed-in player. A stored session plus a
// stubbed `players` lookup is enough for AuthContext to treat the browser as
// one, with no real account or network access to Supabase's auth. The
// session is never verified by the page, only read from localStorage.
async function signInAsPlayer(page: Page, supabaseUrl: string) {
  const storageKey = `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`
  const session = {
    access_token: "a11y.test.token",
    refresh_token: "a11y-test-refresh",
    token_type: "bearer",
    expires_in: 36_000,
    expires_at: Math.floor(Date.now() / 1000) + 36_000,
    user: { id: "00000000-0000-0000-0000-000000000001", aud: "authenticated", role: "authenticated", email: "a11y@example.com" },
  }
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, JSON.stringify(session)])
  await page.route("**/rest/v1/players*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([{ id: "a11y-player", name: "A11y Player", email: "a11y@example.com" }]),
    })
  )
}

// The homepage map is loaded lazily, so a scan taken right after networkidle can
// run before any Leaflet marker exists and pass without ever seeing one. When the
// page lists tournaments, wait until their markers are on screen so axe scans
// them. An empty database has nothing to wait for and falls through.
async function waitForMapMarkers(page: Page) {
  const hasTournaments = (await page.locator('a[href^="/tournaments/"]').count()) > 0
  if (!hasTournaments) return
  await expect(
    page.locator(".leaflet-marker-icon.leaflet-interactive").first(),
    "the map shows no markers although the page lists tournaments"
  ).toBeVisible({ timeout: 30_000 })
}

async function expectNoSeriousViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page }).analyze()

  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical")
  const minor = violations.filter((v) => v.impact !== "serious" && v.impact !== "critical")
  if (minor.length > 0) {
    console.warn(`${label}: ${minor.length} moderate/minor axe finding(s): ${minor.map((v) => v.id).join(", ")}`)
  }

  const summary = blocking.map((v) => ({
    rule: v.id,
    impact: v.impact,
    help: v.help,
    targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")),
    nodes: v.nodes.length,
  }))
  expect(summary, `${label} has serious or critical axe violations`).toEqual([])
}

const STATIC_PAGES = [
  { name: "homepage", path: "/" },
  { name: "tournaments list", path: "/tournaments" },
  { name: "country page", path: "/country/in" },
  { name: "player login", path: "/player/login" },
  { name: "submit", path: "/submit" },
]

test.describe("axe accessibility", () => {
  for (const theme of THEMES) {
    for (const { name, path } of STATIC_PAGES) {
      test(`${name} (${path}) has no serious violations in ${theme} theme`, async ({ page }) => {
        const response = await openAs(page, theme, path)
        expect(response?.status()).toBe(200)
        if (path === "/") await waitForMapMarkers(page)
        await expectNoSeriousViolations(page, `${path} [${theme}]`)
      })
    }

    test(`tournament page has no serious violations in ${theme} theme`, async ({ page }) => {
      // The id is discovered from the list rather than hard-coded, so the test
      // follows whatever data the database holds. With an empty or unreachable
      // database (local runs on dummy Supabase credentials) there is no page to scan.
      await openAs(page, theme, "/tournaments")
      const link = page.locator('a[href^="/tournaments/"]').first()
      const href = (await link.count()) > 0 ? await link.getAttribute("href") : null
      test.skip(!href, "no published tournament in the list, so there is no detail page to scan")

      const response = await openAs(page, theme, href!)
      expect(response?.status()).toBe(200)
      await expectNoSeriousViolations(page, `${href} [${theme}]`)
    })

    test(`submit form (signed in) has no serious violations in ${theme} theme`, async ({ page }) => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      test.skip(!supabaseUrl, "needs NEXT_PUBLIC_SUPABASE_URL to name the session's storage key")

      await signInAsPlayer(page, supabaseUrl!)
      await openAs(page, theme, "/submit")
      await expect(page.locator("form")).toBeVisible()
      await expectNoSeriousViolations(page, `/submit form [${theme}]`)
    })
  }
})
