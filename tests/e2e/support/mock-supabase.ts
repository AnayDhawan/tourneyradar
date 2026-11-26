import type { Page, Route } from "@playwright/test";

// Shared by the smoke specs that must never touch a live Supabase project:
// no real auth user, no real database rows, no real email. The specs seed a
// browser session into localStorage and answer every Supabase request the
// page makes from here instead.

export const FAKE_PLAYER = {
  id: "00000000-0000-4000-8000-000000000001",
  auth_user_id: "00000000-0000-4000-8000-000000000002",
  name: "Smoke Test Player",
  email: "smoke-test@example.com",
  notify_frequency: "off",
  notify_categories: [],
  min_fide_rated: false,
};

// Runs in the Playwright test process, not the browser, so it reads the same
// variable the dev server was started with.
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

// supabase-js derives its localStorage key from the project URL's first
// hostname label: https://abc.supabase.co -> sb-abc-auth-token.
export function sessionStorageKey(url: string): string {
  return `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
}

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export interface FakeSession {
  accessToken: string;
  stored: string;
}

// A JWT-shaped token with a throwaway signature. The app never verifies it:
// the browser client only reads expires_at, and the API routes under test are
// mocked, so nothing ever checks the signature.
export function buildFakeSession(): FakeSession {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiresAt = nowSeconds + 60 * 60;
  const accessToken = [
    base64url({ alg: "HS256", typ: "JWT" }),
    base64url({ sub: FAKE_PLAYER.auth_user_id, role: "authenticated", exp: expiresAt }),
    "signature",
  ].join(".");

  const stored = JSON.stringify({
    access_token: accessToken,
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user: {
      id: FAKE_PLAYER.auth_user_id,
      aud: "authenticated",
      role: "authenticated",
      email: FAKE_PLAYER.email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(nowSeconds * 1000).toISOString(),
    },
  });
  return { accessToken, stored };
}

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,HEAD,OPTIONS",
  "access-control-expose-headers": "*",
};

function respond(route: Route, status: number, body?: unknown, extra: Record<string, string> = {}) {
  return route.fulfill({
    status,
    headers: { ...CORS_HEADERS, ...extra },
    ...(body === undefined
      ? {}
      : { contentType: "application/json", body: JSON.stringify(body) }),
  });
}

export interface SupabaseMockLog {
  // Auth requests the page made, e.g. "POST /auth/v1/logout".
  auth: string[];
}

/**
 * Signs a fake player in and answers all Supabase traffic locally.
 *
 * - The session is written to localStorage before any page script runs, so the
 *   app boots already signed in.
 * - `/rest/v1/players` returns the fake player (the AuthContext lookup); every
 *   other table answers empty, so nothing depends on live data.
 * - `/auth/v1/*` answers token refresh/user/logout without a network call.
 *
 * Routes match any host (`**`), so it works for whatever project URL the dev
 * server was started with, and the page can never reach a real project.
 */
export async function signInFakePlayer(page: Page, url: string): Promise<{ session: FakeSession; log: SupabaseMockLog; storageKey: string }> {
  const session = buildFakeSession();
  const storageKey = sessionStorageKey(url);
  const log: SupabaseMockLog = { auth: [] };

  await page.addInitScript(
    ([key, value]) => {
      // Only seed once: after sign-out the app removes the key and a reload
      // must stay signed out.
      if (!window.sessionStorage.getItem("e2e-session-seeded")) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem("e2e-session-seeded", "1");
      }
    },
    [storageKey, session.stored] as const
  );

  await page.route("**/auth/v1/**", (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    if (request.method() === "OPTIONS") return respond(route, 204);
    log.auth.push(`${request.method()} ${pathname}`);
    if (pathname.endsWith("/logout")) return respond(route, 204);
    if (pathname.endsWith("/user")) return respond(route, 200, JSON.parse(session.stored).user);
    return respond(route, 200, JSON.parse(session.stored));
  });

  await page.route("**/rest/v1/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return respond(route, 204);
    const { pathname } = new URL(request.url());
    const wantsObject = (request.headers()["accept"] ?? "").includes("vnd.pgrst.object");

    if (pathname.endsWith("/players") && request.method() === "GET") {
      return respond(route, 200, wantsObject ? FAKE_PLAYER : [FAKE_PLAYER]);
    }
    // PostgREST answers a single-object request that matches nothing with 406,
    // which supabase-js turns into `data: null` for maybeSingle().
    if (wantsObject) return respond(route, 406, { message: "no rows" });
    return respond(route, 200, [], { "content-range": "*/0" });
  });

  return { session, log, storageKey };
}
