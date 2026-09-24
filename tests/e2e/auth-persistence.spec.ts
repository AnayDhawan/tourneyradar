import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

// Regression test for: players were logged out on every reload. Root cause was
// lib/supabase.ts's browser client setting `persistSession: false`, so Supabase
// never wrote the session to localStorage for reload to pick back up.

// Unlike the app itself (Next.js loads .env.local on its own) or the repo's
// standalone scripts (run via `tsx --env-file=.env.local`), the Playwright
// test process has no env loader of its own, and this is the first e2e spec
// that talks to Supabase directly rather than only through the running app.
//
// Guarded, because .env.local is a local-development file and does not exist
// in CI, where the workflow supplies the same variables from repository
// secrets. loadEnvFile throws ENOENT on a missing file, and a throw at module
// scope fails collection for the entire run, so this one unguarded line was
// taking every other e2e spec down with it.
if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("session persists across reload", () => {
  // The service role key bypasses RLS, so it is deliberately not available
  // everywhere: fork pull requests and Dependabot runs get no secrets at all,
  // and a fresh clone has no .env.local. Skip with a reason rather than
  // failing, so a missing key reads as "not run here" instead of "broken".
  test.skip(
    !supabaseUrl || !serviceRoleKey,
    "needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  );

  // Generated per attempt, inside beforeAll, not once at module scope.
  // A timestamp fixed at import time is the same string on a retry in the same
  // worker, so the second attempt collided with the row the first one had
  // already inserted and failed on players_email_key. A random suffix makes
  // each attempt genuinely distinct.
  const password = "Test-password-123";
  let email: string;
  let authUserId: string;

  const adminClient = () =>
    createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  test.beforeAll(async () => {
    const admin = adminClient();
    email = `e2e-auth-persist-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`;

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`test user setup failed: ${error?.message}`);
    authUserId = data.user.id;

    const { error: insertError } = await admin
      .from("players")
      .upsert({ auth_user_id: authUserId, email, name: "E2E Auth Test" }, { onConflict: "email" });
    // upsert rather than insert, because a transport-level retry of a request
    // that actually succeeded would otherwise fail the setup on a duplicate key
    // for a row this same run had just written.
    if (insertError) throw new Error(`test player row setup failed: ${insertError.message}`);
  });

  test.afterAll(async () => {
    // Runs even when beforeAll failed part way, so both deletes are guarded and
    // neither is allowed to throw: an unclean teardown must not mask the real
    // failure, and leaving rows behind in a shared database is worse than a
    // noisy log line.
    const admin = adminClient();
    if (email) await admin.from("players").delete().eq("email", email);
    if (authUserId) await admin.auth.admin.deleteUser(authUserId);
  });

  test("player stays logged in after a page reload", async ({ page }) => {
    // Dev server compiles /player/login on first hit, same class of delay
    // playwright.config.ts already notes for the homepage's map.
    test.slow();
    await page.goto("/player/login");
    await page.getByPlaceholder("john@example.com").fill(email);
    await page.getByPlaceholder("Enter your password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page).toHaveURL(/\/player\/wishlist/);
    await expect(page.getByLabel("Account menu")).toBeVisible();

    await page.reload();

    await expect(page.getByLabel("Account menu")).toBeVisible({ timeout: 10_000 });
  });
});
