// Lightweight Umami event helper. Analytics must never break UX, so every call
// is guarded and wrapped in try/catch. Use this instead of touching
// window.umami directly.

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
    // swallow — analytics failures must not affect the page
  }
}
