import { Resend } from 'resend';
import type { Tournament } from './supabase';

// Thin wrapper around Resend for the weekly digest email (#119). Kept small
// and inline-templated on purpose, this repo has exactly one transactional
// email so far and a templating library would be pure overhead. Supabase
// Auth's own confirmation email is separate and untouched by this file.

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// From address: no existing sender identity in the repo to copy, so this is
// a placeholder. Whoever wires up the real Resend domain should replace it
// (and ideally pull it from an env var) before this ships.
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'TourneyRadar <digest@tourneyradar.com>';

let client: Resend | null = null;

function getClient(): Resend {
  if (!RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable.');
  }
  if (!client) {
    client = new Resend(RESEND_API_KEY);
  }
  return client;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(date: string): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function tournamentLocation(t: Tournament): string {
  return [t.city, t.country].filter(Boolean).join(', ') || t.location || 'Location TBA';
}

function tournamentLink(t: Tournament): string {
  return t.external_link || t.source_url || `https://tourneyradar.com/tournaments/${t.id}`;
}

function buildHtml(tournaments: Tournament[], unsubscribeUrl: string): string {
  const rows = tournaments
    .map((t) => {
      const name = escapeHtml(t.name);
      const location = escapeHtml(tournamentLocation(t));
      const link = escapeHtml(tournamentLink(t));
      const date = escapeHtml(formatDate(t.date));
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e5e5;">
            <a href="${link}" style="color:#1a1a1a;font-weight:600;text-decoration:none;font-size:15px;">${name}</a>
            <div style="color:#666;font-size:13px;margin-top:4px;">${date} &middot; ${location}</div>
          </td>
        </tr>`;
    })
    .join('');

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="font-size:20px;margin:0 0 8px;">New tournaments matching your preferences</h1>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">
        ${tournaments.length} new tournament${tournaments.length === 1 ? '' : 's'} were added this week that match your saved country, category, and rating preferences.
      </p>
      <table style="width:100%;border-collapse:collapse;">
        ${rows}
      </table>
      <p style="color:#999;font-size:12px;margin-top:32px;border-top:1px solid #e5e5e5;padding-top:16px;">
        You're receiving this because your TourneyRadar notification preference is set to weekly.
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#999;">Unsubscribe</a>
      </p>
    </div>`;
}

/**
 * Sends one batched digest email listing newly-scraped tournaments that
 * match a player's saved preferences. Throws on failure so the caller
 * (scripts/send-digest.ts) can count/log it rather than silently drop it.
 */
export async function sendDigestEmail(
  to: string,
  tournaments: Tournament[],
  unsubscribeUrl: string
): Promise<void> {
  if (tournaments.length === 0) return;

  const resend = getClient();
  const subject =
    tournaments.length === 1
      ? `1 new tournament matching your preferences`
      : `${tournaments.length} new tournaments matching your preferences`;

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html: buildHtml(tournaments, unsubscribeUrl),
  });

  if (error) {
    throw new Error(`Resend error sending digest to ${to}: ${error.message}`);
  }
}
