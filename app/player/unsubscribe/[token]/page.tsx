import Link from "next/link";
import BaseLayout from "@/components/BaseLayout";
import { unsubscribeByToken } from "@/lib/supabase-server";

type Props = {
  params: Promise<{ token: string }>;
};

// Public, unauthenticated by design: the visitor arrives from an emailed
// digest link (see the digest-job issue #119) carrying only
// players.unsubscribe_token in the URL, never a session. One click is the
// standard deliverability-hygiene pattern -- no confirm step -- so the
// unsubscribe happens server-side before this page renders anything.
export default async function UnsubscribePage({ params }: Props) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);

  return (
    <BaseLayout
      showHero
      heroTitle={<>Email <span className="highlight">preferences</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            {result.status === "unsubscribed" && (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                  You&apos;re unsubscribed
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  We won&apos;t send you any more tournament emails. You can turn them back on
                  any time from your account settings.
                </p>
                <Link href="/player/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                  Go to account settings
                </Link>
              </>
            )}

            {result.status === "not_found" && (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🤔</div>
                <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                  Link not recognized
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  This unsubscribe link is invalid or has already been used. If you&apos;re
                  still receiving emails you don&apos;t want, sign in and update your
                  preferences directly.
                </p>
                <Link href="/player/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                  Sign in
                </Link>
              </>
            )}

            {result.status === "error" && (
              <>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
                <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                  Something went wrong
                </h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  We couldn&apos;t process this request. Please try the link again in a moment.
                </p>
              </>
            )}
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
