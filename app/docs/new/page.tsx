"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useThemePreference } from "@/lib/theme";
import { slugify } from "@/lib/docs";
import BaseLayout from "@/components/BaseLayout";

const RATE_LIMIT_PER_WEEK = 2;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export default function NewDocPage() {
  const router = useRouter();
  const { user, userType, loading: authLoading } = useAuth();
  useThemePreference();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<string | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/player/login");
  }, [authLoading, user, router]);

  // Pre-check the weekly cap client-side so the form can say exactly when
  // the next slot opens, rather than only finding out from a 42501 on
  // submit. The RLS insert policy is still the real enforcement -- this is
  // UX, not the security boundary.
  useEffect(() => {
    if (!user || userType !== "player") return;
    let cancelled = false;

    async function checkLimit() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("docs")
        .select("created_at")
        .eq("author_player_id", user!.id)
        .gt("created_at", sevenDaysAgo)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (data && data.length >= RATE_LIMIT_PER_WEEK) {
        const oldest = new Date(data[0].created_at);
        const opensAt = new Date(oldest.getTime() + 7 * 24 * 60 * 60 * 1000);
        setRateLimitedUntil(opensAt.toISOString());
      }
      setCheckingLimit(false);
    }

    checkLimit();
    return () => {
      cancelled = true;
    };
  }, [user, userType]);

  const publish = async () => {
    if (!user || !title.trim() || !content.trim()) return;
    setSaving(true);
    setError(null);

    const baseSlug = slugify(title);
    if (!baseSlug) {
      setError("Title needs at least one letter or number.");
      setSaving(false);
      return;
    }

    try {
      let slug = baseSlug;
      let attempt = 0;
      // Slug collisions are rare (titles rarely match exactly) but not
      // impossible; retry a few times with a numeric suffix before giving up.
      for (; attempt < 5; attempt++) {
        const { error: insertError } = await supabase.from("docs").insert({
          slug,
          title: title.trim(),
          summary: summary.trim() || null,
          content: content.trim(),
          author_type: "user",
          author_player_id: user.id,
          author_display_name: user.name || "A TourneyRadar player",
        });

        if (!insertError) {
          router.push(`/docs/${slug}`);
          return;
        }

        if (insertError.code === "23505") {
          attempt += 1;
          slug = `${baseSlug}-${attempt + 1}`;
          continue;
        }

        if (insertError.code === "42501") {
          throw new Error(
            `You've published ${RATE_LIMIT_PER_WEEK} docs this week. Try again after ${
              rateLimitedUntil ? formatDate(rateLimitedUntil) : "your oldest one turns a week old"
            }.`
          );
        }

        throw insertError;
      }

      throw new Error("Couldn't find a free slug for this title, try a more specific title.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't publish this doc");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || userType !== "player") {
    return <div style={{ background: "var(--background)", minHeight: "100vh" }} />;
  }

  return (
    <BaseLayout showHero heroTitle={<>Write a <span className="highlight">Doc</span></>} heroDescription="Share a guide with other players. Up to 2 a week.">
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "760px" }}>
          {!checkingLimit && rateLimitedUntil && (
            <div className="card" style={{ background: "var(--surface-elevated)", marginBottom: "1.5rem" }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                You&apos;ve published {RATE_LIMIT_PER_WEEK} docs this week.
              </p>
              <p style={{ color: "var(--text-secondary)", marginTop: "0.375rem" }}>
                You can publish another after {formatDate(rateLimitedUntil)}.
              </p>
            </div>
          )}

          <div className="card">
            {error && (
              <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                Title
              </label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Packing list for your first over-the-board tournament"
                maxLength={120}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                Summary (optional)
              </label>
              <input
                className="form-input"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="One sentence, shown on the Docs index"
                maxLength={200}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Content (Markdown)
                </label>
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer" }}
                >
                  {preview ? "Edit" : "Preview"}
                </button>
              </div>

              {preview ? (
                <div className="doc-content" style={{ minHeight: "300px", border: "1px solid var(--border)", borderRadius: "12px", padding: "1rem" }}>
                  {content.trim() ? <ReactMarkdown>{content}</ReactMarkdown> : (
                    <p style={{ color: "var(--text-muted)" }}>Nothing to preview yet.</p>
                  )}
                </div>
              ) : (
                <textarea
                  className="form-input"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write in Markdown -- headings, lists, links, `code`."
                  rows={16}
                  style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.875rem", resize: "vertical" }}
                />
              )}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", opacity: saving || !!rateLimitedUntil ? 0.6 : 1 }}
              onClick={publish}
              disabled={saving || checkingLimit || !!rateLimitedUntil || !title.trim() || !content.trim()}
            >
              {saving ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
