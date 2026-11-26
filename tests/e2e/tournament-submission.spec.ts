import { test, expect } from "@playwright/test";
import { signInFakePlayer, supabaseUrl } from "./support/mock-supabase";

// Automates the "submit a tournament" half of the owner smoke test (issue #284)
// without any live service: a fake signed-in player, Supabase answered by route
// mocks (see support/mock-supabase.ts) and POST /api/tournaments/submit
// intercepted, so no row is written and no email is sent.
//
// The "approve" half is deliberately not a browser step. Approval is a
// moderator CLI action (scripts/review-submissions.ts) that needs the service
// role key and writes to the database; no page, button or API route exists for
// it in the app, and the logic lives in that script rather than in lib/. What
// the browser can prove is that a submission leaves the form as a request the
// server accepts for review (the pending state), which is asserted below. The
// pending-row shape and validation are covered by lib/tournament-submission.test.ts
// and app/api/tournaments/submit/route.test.ts. Approving a real submission
// against the live project remains an owner step.

const url = supabaseUrl();

// A date comfortably inside the allowed window, computed so the spec does not
// start failing when a hard-coded day slips into the past.
function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

test.describe("submit a tournament", () => {
  test.skip(!url, "needs NEXT_PUBLIC_SUPABASE_URL (any value; Supabase is mocked)");

  test("a signed-in player's submission is sent for review", async ({ page }) => {
    // First hit of /submit compiles it under the dev server.
    test.slow();
    const { session } = await signInFakePlayer(page, url!);

    const submissions: { authorization: string | undefined; body: unknown }[] = [];
    await page.route("**/api/tournaments/submit", async (route) => {
      const request = route.request();
      submissions.push({
        authorization: request.headers()["authorization"],
        body: request.postDataJSON(),
      });
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    const startDate = daysFromNow(30);
    const endDate = daysFromNow(32);

    await page.goto("/submit");
    await expect(page.getByLabel("Tournament name *")).toBeVisible({ timeout: 15_000 });

    await page.getByLabel("Tournament name *").fill("Smoke Test Open");
    await page.getByLabel("Start date *").fill(startDate);
    await page.getByLabel("End date (optional)").fill(endDate);
    await page.getByLabel("City *").fill("Pune");
    await page.getByLabel("Country *").selectOption("IN");
    await page.getByLabel("Time control *").selectOption("Rapid");
    await page.getByLabel("FIDE rated *").selectOption("yes");
    await page.getByLabel("Link to the tournament page *").fill("https://example.com/smoke-test-open");
    await page.getByRole("button", { name: "Submit for review" }).click();

    // Pending state: the player is told it waits for a moderator.
    await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
    await expect(page.getByText("waiting for review")).toBeVisible();

    expect(submissions).toHaveLength(1);
    expect(submissions[0].authorization).toBe(`Bearer ${session.accessToken}`);
    expect(submissions[0].body).toEqual({
      name: "Smoke Test Open",
      date: startDate,
      end_date: endDate,
      city: "Pune",
      country_code: "IN",
      category: "Rapid",
      fide_rated: true,
      external_link: "https://example.com/smoke-test-open",
      website: "", // honeypot stays empty for a real person
    });
  });

  test("field errors from the server are shown and nothing is marked submitted", async ({ page }) => {
    test.slow();
    await signInFakePlayer(page, url!);

    await page.route("**/api/tournaments/submit", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Check the form", fields: { name: "Enter the tournament name (3 to 120 characters)" } }),
      })
    );

    await page.goto("/submit");
    await page.getByLabel("Tournament name *").fill("ab");
    await page.getByRole("button", { name: "Submit for review" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Check the form" })).toBeVisible();
    await expect(page.getByText("Enter the tournament name (3 to 120 characters)")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Thank you" })).toHaveCount(0);
  });
});
