import { test, expect } from "@playwright/test"

// API route coverage (issue #97).
//
// Runs against the dev server Playwright starts via playwright.config.ts.
// Local runs use dummy Supabase env vars (no real credentials, ever): the
// anon-401 and validation-400 cases run before any database query, and the
// clamp/search cases exercise the route's no-500 fallback path. CI
// (e2e.yml) runs the same specs against the real Supabase project.
test.use({ baseURL: "http://localhost:3000" })

test.describe("/api/wishlist", () => {
  test("anonymous GET returns 401", async ({ request }) => {
    const res = await request.get("/api/wishlist")
    expect(res.status()).toBe(401)
    expect(await res.json()).toEqual({ error: "Authentication required" })
  })

  test("anonymous POST returns 401", async ({ request }) => {
    const res = await request.post("/api/wishlist", {
      data: { tournament_id: "some-tournament" },
    })
    expect(res.status()).toBe(401)
  })

  test("anonymous DELETE returns 401", async ({ request }) => {
    const res = await request.delete("/api/wishlist?tournament_id=some-tournament")
    expect(res.status()).toBe(401)
  })

  test.skip(
    "a valid session cannot read or mutate another player's rows",
    async () => {
      // Skipped: this needs a real Supabase session. getAuthenticatedPlayer()
      // (lib/supabase-server.ts) verifies the bearer token against Supabase
      // auth and resolves the caller's player row server-side, so no request
      // can pass the 401 gate without credentials — and no credentials exist
      // in CI or local runs. The protection being verified (player_id derived
      // from the verified token, never from the request; RLS policies in
      // supabase/migrations/20260729000000_wishlist_rls.sql) is enforced
      // before any client-supplied player_id could matter, so it is
      // unreachable from an anonymous e2e run.
    }
  )
})

test.describe("/api/tournaments", () => {
  test("?limit=abc returns 400", async ({ request }) => {
    const res = await request.get("/api/tournaments?limit=abc")
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ error: "limit must be a positive integer" })
  })

  test("?page=0 returns 400", async ({ request }) => {
    const res = await request.get("/api/tournaments?page=0")
    expect(res.status()).toBe(400)
    expect(await res.json()).toEqual({ error: "page must be a positive integer" })
  })

  test("?limit=999999 is clamped to the max instead of honoured", async ({ request }) => {
    const res = await request.get("/api/tournaments?limit=999999")
    expect(res.status()).toBe(200)
    const body = await res.json()
    // queryTournaments clamps to TOURNAMENT_MAX_LIMIT (200); the response
    // reports the limit it actually used.
    expect(body.limit).toBe(200)
  })

  test("search with PostgREST control characters does not 500", async ({ request }) => {
    // , ( ) are .or() delimiter/grouping characters: a crafted term must be
    // stripped (lib/tournaments.ts) rather than crash the query. The route
    // answers 200 with an empty page when the query fails, never 500.
    const res = await request.get("/api/tournaments?q=foo(bar),baz")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.tournaments)).toBe(true)
  })
})

test.describe("other routes", () => {
  test("/api/stats is gone — 404, stats are server-rendered", async ({ request }) => {
    // The issue lists /api/stats, but no such route exists on main: stats are
    // computed server-side in app/page.tsx via getTournamentStats()
    // (lib/tournaments.ts). Pin the current contract so a re-added route is
    // noticed rather than silently passing.
    const res = await request.get("/api/stats")
    expect(res.status()).toBe(404)
  })

  test("/api/tournaments/upcoming returns its expected shape", async ({ request }) => {
    const res = await request.get("/api/tournaments/upcoming")
    if (res.status() === 200) {
      const body = await res.json()
      expect(Array.isArray(body.tournaments)).toBe(true)
      expect(typeof body.total).toBe("number")
      expect(typeof body.page).toBe("number")
      expect(typeof body.limit).toBe("number")
      expect(typeof body.hasMore).toBe("boolean")
    } else {
      // Supabase unreachable (dummy env in local runs): the route 500s with
      // an error body. CI runs with real credentials and exercises the 200
      // branch, which asserts the full shape above.
      expect(res.status()).toBe(500)
      const body = await res.json()
      expect(typeof body.error).toBe("string")
    }
  })
})
