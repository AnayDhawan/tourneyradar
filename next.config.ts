import type { NextConfig } from "next";

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogAssetsHost = process.env.NEXT_PUBLIC_POSTHOG_ASSETS_HOST;

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

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    const rules = [
      { source: "/relay/script.js", destination: `${umamiScriptHost}/script.js` },
      { source: "/relay/api/send", destination: `${umamiGatewayHost}/api/send` },
    ];

    // PostHog stays gated: without a host there is nowhere to proxy to.
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
