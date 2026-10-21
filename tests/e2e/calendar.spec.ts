import { test, expect } from "@playwright/test"

// Per-country calendar feed (issue #195).
//
// With a reachable database the feed is an iCalendar document: the right
// Content-Type, a VCALENDAR wrapper, and one VEVENT per upcoming tournament.
// With dummy Supabase credentials (local runs) the route answers 500, so the
// content checks are skipped there. CI runs with real credentials.
test.use({ baseURL: "http://localhost:3000" })

test.describe("/api/calendar/[country]", () => {
  test("an unknown country code returns 404", async ({ request }) => {
    const res = await request.get("/api/calendar/ZZ")
    expect(res.status()).toBe(404)
  })

  test("returns a valid ICS feed with at least one VEVENT for a country with events", async ({ request }) => {
    let withEvents: string | null = null
    for (const code of ["IN", "US", "DE", "FR", "ES"]) {
      const res = await request.get(`/api/calendar/${code}`)
      test.skip(res.status() === 500, "needs a reachable Supabase project")
      expect(res.status()).toBe(200)
      expect(res.headers()["content-type"]).toContain("text/calendar")
      const body = await res.text()
      expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true)
      expect(body.trimEnd().endsWith("END:VCALENDAR")).toBe(true)
      expect(body).toContain("VERSION:2.0")
      if (body.includes("BEGIN:VEVENT") && !withEvents) withEvents = body
    }
    expect(withEvents, "none of the checked countries had an upcoming tournament").not.toBeNull()
    expect(withEvents).toContain("END:VEVENT")
    expect(withEvents).toMatch(/DTSTART;VALUE=DATE:\d{8}/)
  })

  test("accepts the .ics suffix on the country code", async ({ request }) => {
    const res = await request.get("/api/calendar/in.ics")
    test.skip(res.status() === 500, "needs a reachable Supabase project")
    expect(res.status()).toBe(200)
    expect(res.headers()["content-type"]).toContain("text/calendar")
  })
})
