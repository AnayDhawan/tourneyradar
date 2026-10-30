import type { NextConfig } from "next";

// Defaulted, not required. This project is EU region (see .env.local and the
// project token). Leaving it env-only meant one unset variable on the
// deployment silently 404d the whole /ingest proxy and stopped posthog.init()
// from ever running in production, with nothing in the UI to show for it.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

// PostHog serves its static assets from a sibling host: eu.i.posthog.com pairs
// with eu-assets.i.posthog.com. Derive it rather than requiring a second
// variable, because the old code ANDed the two together and returned no
// rewrites at all if either was missing, which silently 404s the entire
// /ingest proxy.
const posthogAssetsHost =
  process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST ??
  posthogHost?.replace(/^(https:\/\/)([a-z0-9]+)\.i\.posthog\.com/, "$1$2-assets.i.posthog.com");

// Umami is proxied for the same reason PostHog already is: a blocked analytics
// request is indistinguishable from a visitor who never engaged, so the numbers
// quietly under-report rather than visibly break.
//
// The two upstreams are deliberately different hosts. The tracker resolves its
// collect endpoint as `${data-host-url || "https://gateway.umami.is"}/api/send`,
// so proxying only cloud.umami.is would serve the script from our own origin
// while its events still went straight out to gateway.umami.is. Both are on the
// standard blocklists. app/layout.tsx passes data-host-url="/relay" to point the
// second half at the rewrite below.
//
// The prefix is /relay, not /stats: /stats is already a public page in this app,
// and /stats/ is exactly the kind of path segment the generic blocklist rules
// match on, which would have reintroduced the problem this proxy exists to fix.
const umamiScriptHost = process.env.UMAMI_SCRIPT_HOST ?? "https://cloud.umami.is";
const umamiGatewayHost = process.env.UMAMI_GATEWAY_HOST ?? "https://gateway.umami.is";

// Content-Security-Policy, report-only for now: violations show up in the browser
// console without blocking anything. Once they are clean on the main pages it can be
// switched to an enforcing Content-Security-Policy header.
//
// Origins in use: Supabase (REST and realtime), OpenStreetMap tiles for the map, and
// Google Analytics when NEXT_PUBLIC_GA_ID is set. PostHog, Umami and Vercel Analytics all
// go through same-origin paths (/ingest, /relay, /_vercel), so they need no entry.
// 'unsafe-inline' is needed for the inline theme script and the JSON-LD blocks in the
// layout; a nonce would remove it but forces every page to render dynamically.
function supabaseOrigins(): string[] {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return [url.origin, `${url.protocol === "https:" ? "wss:" : "ws:"}//${url.host}`];
  } catch {
    return [];
  }
}

function contentSecurityPolicy(): string {
  const analytics = process.env.NEXT_PUBLIC_GA_ID !== undefined && process.env.NEXT_PUBLIC_GA_ID !== "";
  const dev = process.env.NODE_ENV !== "production";

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      ...(analytics ? ["https://www.googletagmanager.com"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.tile.openstreetmap.org",
      ...(analytics ? ["https://www.google-analytics.com", "https://www.googletagmanager.com"] : []),
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...supabaseOrigins(),
      ...(analytics
        ? ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"]
        : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  };

  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=()" },
          { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy() },
        ],
      },
    ];
  },
  async rewrites() {
    const rules = [
      { source: "/relay/script.js", destination: `${umamiScriptHost}/script.js` },
      { source: "/relay/api/send", destination: `${umamiGatewayHost}/api/send` },
    ];

    // PostHog stays gated on the host alone: without one there is nowhere to
    // proxy to. The assets host is derived above and cannot independently
    // disable this block.
    if (posthogHost && posthogAssetsHost) {
      rules.push(
        { source: "/ingest/static/:path*", destination: `${posthogAssetsHost}/static/:path*` },
        { source: "/ingest/array/:path*", destination: `${posthogAssetsHost}/array/:path*` },
        { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
      );
    }

    return rules;
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
