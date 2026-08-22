import posthog from "posthog-js";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
// Defaulted to the project's EU region so a missing deployment variable
// cannot silently disable analytics again. Override via env for other regions.
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

if (!projectToken || !posthogHost) {
  const missingVariable = !projectToken
    ? "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN"
    : "NEXT_PUBLIC_POSTHOG_HOST";

  const message = `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`;

  if (process.env.NODE_ENV === "development") {
    throw new Error(message);
  }

  // Production used to fall through here in total silence, which is how
  // NEXT_PUBLIC_POSTHOG_HOST went missing on the deployment without anyone
  // noticing that posthog.init() had stopped running and every capture() had
  // become a no-op. Warn instead: still cannot break the page, but it now
  // leaves a trace in the console.
  console.warn(`[analytics] ${message}`);
} else {
  posthog.init(projectToken, {
    api_host: "/ingest",
    ui_host: posthogHost,
    defaults: "2026-01-30",
    capture_exceptions: true,
  });
  posthog.register({ site: "tourneyradar" });
}
