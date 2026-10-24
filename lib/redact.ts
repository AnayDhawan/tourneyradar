// scraper_logs is readable by anyone (supabase/migrations/20260819120000) and
// GitHub Actions logs on this public repo are too, so nothing that identifies
// a subscriber may reach either. Run any error text bound for them through
// redactEmails first; third-party error messages sometimes echo the address
// they were given.
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

export function redactEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, '[redacted-email]');
}
