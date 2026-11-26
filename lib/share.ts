// Sharing a tournament page: what gets shared, and how it is delivered.
//
// The URL is always built from the tournament id on the canonical site origin,
// never read from window.location, so a visitor who arrived through a tracked
// link (utm_*, fbclid, ref, a #hash) does not pass those parameters on.
//
// Delivery is separated from the browser: shareTournament takes the few
// navigator functions it needs, so it can be tested without a DOM.

export const SITE_URL = 'https://www.tourneyradar.com';

export interface ShareableTournament {
  id: string;
  name: string;
  date?: string;
  end_date?: string;
  city?: string;
  location?: string;
}

export interface TournamentShareData {
  title: string;
  text: string;
  url: string;
}

/** Canonical tournament URL: no query string and no hash. */
export function tournamentShareUrl(id: string): string {
  return `${SITE_URL}/tournaments/${encodeURIComponent(id)}`;
}

// Same format as the tournament page: "10 Nov 2026". Unreadable input is
// returned as given rather than throwing.
function formatShareDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

/** One line: "Name | 10 Nov 2026 - 12 Nov 2026 | City". Empty parts are left out. */
export function tournamentShareText(t: ShareableTournament): string {
  const start = formatShareDate(t.date);
  const end = t.end_date && t.end_date !== t.date ? formatShareDate(t.end_date) : '';
  const dates = start && end ? `${start} - ${end}` : start || end;
  const place = (t.city || t.location || '').trim();
  return [t.name.trim(), dates, place].filter(Boolean).join(' | ');
}

export function buildTournamentShare(t: ShareableTournament): TournamentShareData {
  return {
    title: t.name.trim(),
    text: tournamentShareText(t),
    url: tournamentShareUrl(t.id),
  };
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** The subset of `navigator` that sharing uses. Each member may be missing. */
export interface ShareEnvironment {
  share?: (data: TournamentShareData) => Promise<void>;
  canShare?: (data: TournamentShareData) => boolean;
  writeText?: (text: string) => Promise<void>;
  /** Last resort when the async clipboard API is unavailable. */
  legacyCopy?: (text: string) => boolean;
}

function isAbortError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';
}

function canUseNativeShare(env: ShareEnvironment, data: TournamentShareData): boolean {
  if (typeof env.share !== 'function') return false;
  if (typeof env.canShare !== 'function') return true;
  try {
    return env.canShare(data);
  } catch {
    return false;
  }
}

async function copyLink(env: ShareEnvironment, url: string): Promise<boolean> {
  if (typeof env.writeText === 'function') {
    try {
      await env.writeText(url);
      return true;
    } catch {
      // Permission denied or insecure context: try the legacy path.
    }
  }
  if (typeof env.legacyCopy === 'function') {
    try {
      return env.legacyCopy(url);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Opens the native share sheet when there is one, otherwise copies the link.
 * A dismissed share sheet (AbortError) is 'cancelled' and is not an error. Any
 * other share failure falls back to copying, so the visitor still gets the link.
 */
export async function shareTournament(
  data: TournamentShareData,
  env: ShareEnvironment,
): Promise<ShareOutcome> {
  if (canUseNativeShare(env, data) && env.share) {
    try {
      await env.share(data);
      return 'shared';
    } catch (err) {
      if (isAbortError(err)) return 'cancelled';
    }
  }
  return (await copyLink(env, data.url)) ? 'copied' : 'failed';
}

/** Copies through a hidden textarea. Browser only; returns false anywhere else. */
export function copyWithTextarea(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.top = '0';
  el.style.opacity = '0';
  document.body.appendChild(el);
  try {
    el.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(el);
  }
}

/** Binds ShareEnvironment to the current browser. */
export function browserShareEnvironment(): ShareEnvironment {
  if (typeof navigator === 'undefined') return {};
  const nav = navigator;
  return {
    share: typeof nav.share === 'function' ? (d) => nav.share(d) : undefined,
    canShare: typeof nav.canShare === 'function' ? (d) => nav.canShare(d) : undefined,
    writeText: nav.clipboard && typeof nav.clipboard.writeText === 'function'
      ? (text) => nav.clipboard.writeText(text)
      : undefined,
    legacyCopy: copyWithTextarea,
  };
}
