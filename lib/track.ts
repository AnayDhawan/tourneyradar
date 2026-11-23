// Lightweight analytics helper. Sends events to Umami.
//
// Analytics must never break UX, so the call is guarded: a failure here must
// not affect the page.

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
}
