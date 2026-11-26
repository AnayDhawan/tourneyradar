import { test, expect } from "@playwright/test"

// Service worker and installable web app (issue #261). The cache rules
// themselves are unit-tested in lib/service-worker.test.ts; this checks the
// pieces only a real browser and server can show: the files are served with the
// right types, the page registers the worker, and an offline navigation gets
// the offline page.
test.use({ baseURL: "http://localhost:3000" })

test.describe("static files", () => {
  test("/sw.js is served as JavaScript", async ({ request }) => {
    const res = await request.get("/sw.js")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toMatch(/javascript/)
  })

  test("/offline.html is served", async ({ request }) => {
    const res = await request.get("/offline.html")
    expect(res.status()).toBe(200)
    expect(await res.text()).toContain("You are offline")
  })

  test("the manifest declares a standalone app with 192 and 512 icons", async ({ request }) => {
    const res = await request.get("/site.webmanifest")
    expect(res.status()).toBe(200)
    const manifest = await res.json()
    expect(manifest.display).toBe("standalone")
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes)
    expect(sizes).toContain("192x192")
    expect(sizes).toContain("512x512")
  })
})

test.describe("registration", () => {
  // The worker registers only in production builds (not under `next dev`), and
  // CI runs the production build (see playwright.config.ts).
  test.skip(!process.env.CI, "the worker registers only in a production build; set CI=1 to build and run one")

  test("registers on the first visit and takes control", async ({ page }) => {
    await page.goto("/about")
    const scriptUrl = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      return registration.active?.scriptURL ?? null
    })
    expect(scriptUrl).toMatch(/\/sw\.js\?v=.+/)
  })

  test("an offline navigation shows the offline page, and API calls are not cached", async ({ page, context }) => {
    await page.goto("/about")
    await page.evaluate(() => navigator.serviceWorker.ready)
    // clients.claim() takes control of this page once the worker activates.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

    const cachedUrls = await page.evaluate(async () => {
      const urls: string[] = []
      for (const name of await caches.keys()) {
        for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname)
      }
      return urls
    })
    expect(cachedUrls).toContain("/offline.html")
    expect(cachedUrls.filter((p) => p.startsWith("/api/"))).toEqual([])

    await context.setOffline(true)
    await page.goto("/tournaments").catch(() => undefined)
    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible()
  })
})
