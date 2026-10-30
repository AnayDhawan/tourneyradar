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

  // Warn instead of throwing: missing analytics credentials should never crash
  // the dev server for new contributors, while still leaving a trace in the console.
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
