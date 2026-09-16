import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Regression test for: players were logged out on every reload. Root cause was
// lib/supabase.ts's browser client setting `persistSession: false`, so Supabase
// never wrote the session to localStorage for reload to pick back up.

// Unlike the app itself (Next.js loads .env.local on its own) or the repo's
// standalone scripts (run via `tsx --env-file=.env.local`), the Playwright
// test process has no env loader of its own, and this is the first e2e spec
// that talks to Supabase directly rather than only through the running app.
process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

test.describe("session persists across reload", () => {
  const email = `e2e-auth-persist-${Date.now()}@example.com`;
  const password = "Test-password-123";
  let authUserId: string;

  test.beforeAll(async () => {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`test user setup failed: ${error?.message}`);
    authUserId = data.user.id;

    const { error: insertError } = await admin
      .from("players")
      .insert({ auth_user_id: authUserId, email, name: "E2E Auth Test" });
    if (insertError) throw new Error(`test player row setup failed: ${insertError.message}`);
  });

  test.afterAll(async () => {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await admin.from("players").delete().eq("auth_user_id", authUserId);
    await admin.auth.admin.deleteUser(authUserId);
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
