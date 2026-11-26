import { test, expect } from "@playwright/test";
import { signInFakePlayer, supabaseUrl } from "./support/mock-supabase";

// Automates the "delete an account" owner smoke test (issue #284) without any
// live service. The browser holds a fake session, Supabase is answered by
// route mocks (see support/mock-supabase.ts) and DELETE /api/player/account is
// intercepted, so no auth user, database row or email is ever touched. The
// real route and library are covered by app/api/player/account/route.test.ts.
//
// The live-service version (a real throwaway account against production) stays
// an owner step; this spec guards the browser side of it in CI with no secrets.

const url = supabaseUrl();

test.describe("delete my account", () => {
  // The dev server cannot boot without this variable, so in practice this
  // only matters when the spec file is run on its own against a custom server.
  test.skip(!url, "needs NEXT_PUBLIC_SUPABASE_URL (any value; Supabase is mocked)");

  test("confirming sends DELETE /api/player/account and signs the player out", async ({ page }) => {
    // First hit of /player/settings compiles it under the dev server.
    test.slow();
    const { session, log, storageKey } = await signInFakePlayer(page, url!);

    const deletes: { authorization: string | undefined; body: unknown }[] = [];
    await page.route("**/api/player/account", async (route) => {
      const request = route.request();
      deletes.push({
        authorization: request.headers()["authorization"],
        body: request.postDataJSON(),
      });
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    });

    await page.goto("/player/settings");
    await expect(page.getByRole("heading", { name: "Delete my account" })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Delete my account" }).click();

    // The destructive button stays disabled until the exact word is typed.
    const confirmButton = page.getByRole("button", { name: "Permanently delete" });
    await expect(confirmButton).toBeDisabled();
    await page.getByLabel("Type DELETE to confirm").fill("delete");
    await expect(confirmButton).toBeDisabled();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await expect(confirmButton).toBeEnabled();
    await confirmButton.click();

    // Signed out and sent away from the settings page.
    await expect.poll(() => deletes.length).toBe(1);
    await expect(page).not.toHaveURL(/\/player\/settings/, { timeout: 15_000 });

    expect(deletes[0].authorization).toBe(`Bearer ${session.accessToken}`);
    expect(deletes[0].body).toEqual({ confirm: true });
    expect(log.auth).toContain("POST /auth/v1/logout");
    await expect.poll(() => page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBeNull();
  });

  test("a failed deletion shows the error and keeps the player signed in", async ({ page }) => {
    test.slow();
    const { log, storageKey } = await signInFakePlayer(page, url!);

    let calls = 0;
    await page.route("**/api/player/account", async (route) => {
      calls += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Deleting your account failed part way. Email us and we will finish it." }),
      });
    });

    await page.goto("/player/settings");
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Permanently delete" }).click();

    // Next.js also renders an empty role=alert route announcer, so match by text.
    await expect(page.getByRole("alert").filter({ hasText: "failed part way" })).toBeVisible();
    expect(calls).toBe(1);
    await expect(page).toHaveURL(/\/player\/settings/);
    expect(log.auth).not.toContain("POST /auth/v1/logout");
    expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).not.toBeNull();
  });
});
