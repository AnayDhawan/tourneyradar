import posthog from "posthog-js";

// Lightweight analytics helper. Sends every event to both Umami and PostHog.
//
// These used to be separate call styles: trackEvent() for Umami and
// posthog.capture() for PostHog, with disjoint event sets. That meant roughly
// a dozen events (star_link, share_filters, the feedback funnel) existed only
// in Umami, and Umami is the one an ad blocker can kill, so those events went
// missing for a chunk of visitors with nothing to fall back on. One call site
// now produces one event in each tool.
//
// Analytics must never break UX, so every call is guarded and each backend is
// wrapped separately: a Umami failure must not skip the PostHog send.

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

export function trackEvent(event: string, data?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  try {
    window.umami?.track(event, data);
  } catch {
    // swallow, analytics failures must not affect the page
  }

  try {
    posthog.capture(event, data);
  } catch {
    // swallow, analytics failures must not affect the page
  }
}
