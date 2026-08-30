// Referral / invite-a-friend, v1 (issue #123). Minimal on purpose: capture a
// `?ref=CODE` query param wherever it shows up, hand it to registration if
// the account gets created within a short window. Nothing tracked beyond
// that single value, no fraud detection.

const STORAGE_KEY = "tr_referral_code";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type StoredReferral = {
  code: string;
  storedAt: number;
};

// Call on mount from wherever a `?ref=` link can land (currently just the
// homepage, see components/ReferralCapture.tsx). Safe to call with null/
// empty, this is a no-op then.
export function captureReferralCode(code: string | null): void {
  if (typeof window === "undefined" || !code) return;

  try {
    const entry: StoredReferral = { code: code.trim().toUpperCase(), storedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage can throw (private browsing, quota, disabled). Losing
    // the referral credit is not worth breaking the page over.
  }
}

// Call at registration time. Returns null if nothing was captured, or if
// it's older than MAX_AGE_MS, someone who bookmarked the link and registered
// weeks later shouldn't silently credit a stale referrer.
export function readReferralCode(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const entry = JSON.parse(raw) as StoredReferral;
    if (!entry.code || Date.now() - entry.storedAt > MAX_AGE_MS) return null;

    return entry.code;
  } catch {
    return null;
  }
}
