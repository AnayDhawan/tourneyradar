"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FeedState =
  | { status: "loading" }
  | { status: "off" }
  | { status: "on"; url: string }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Could not reach the calendar feed. Try again in a moment.";

// Private subscribe link for the player's saved tournaments. The secret lives
// only in the URL this component shows; it is fetched from the authenticated
// API with the player's own session and never written to storage or analytics.
export default function WishlistCalendarFeed() {
  const [feed, setFeed] = useState<FeedState>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const call = useCallback(async (method: "GET" | "POST" | "PUT"): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Your session has expired. Sign in again and retry.");

    const response = await fetch("/api/player/calendar-feed", {
      method,
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) throw new Error(GENERIC_ERROR);
    const body = (await response.json()) as { path: string | null };
    return body.path ? new URL(body.path, window.location.origin).toString() : null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    call("GET")
      .then((url) => {
        if (!cancelled) setFeed(url ? { status: "on", url } : { status: "off" });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFeed({ status: "error", message: error instanceof Error ? error.message : GENERIC_ERROR });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [call]);

  async function change(method: "POST" | "PUT") {
    setBusy(true);
    setNotice(null);
    setCopied(false);
    try {
      const url = await call(method);
      if (!url) throw new Error(GENERIC_ERROR);
      setFeed({ status: "on", url });
      setConfirming(false);
      if (method === "PUT") {
        setNotice("New link created. The old link no longer works, so add this one to your calendar.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Could not copy automatically. Select the link and copy it.");
    }
  }

  return (
    <section className="card" style={{ marginBottom: "1.5rem" }} aria-labelledby="wishlist-feed-heading">
      <h2 id="wishlist-feed-heading" className="font-display" style={{ fontSize: "1.25rem", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
        Subscribe in your calendar
      </h2>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1rem" }}>
        Get your saved tournaments in Google Calendar, Apple Calendar or Outlook. Paste the link
        below into &ldquo;Add calendar from URL&rdquo;. The link is private: anyone who has it can
        see your saved tournaments, so do not share it.
      </p>

      {feed.status === "loading" && <p style={{ color: "var(--text-muted)" }}>Loading...</p>}

      {feed.status === "error" && (
        <p role="alert" style={{ color: "var(--error)" }}>{feed.message}</p>
      )}

      {feed.status === "off" && (
        <button className="btn btn-primary" onClick={() => change("POST")} disabled={busy}>
          {busy ? "Creating..." : "Create my calendar link"}
        </button>
      )}

      {feed.status === "on" && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <input
              className="form-input"
              readOnly
              value={feed.url}
              aria-label="Private calendar subscribe URL"
              onFocus={(event) => event.currentTarget.select()}
              style={{ flex: 1, minWidth: "220px" }}
            />
            <button className="btn btn-primary" onClick={() => copy(feed.url)}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div style={{ marginTop: "1rem" }}>
            {!confirming ? (
              <button
                className="btn"
                onClick={() => setConfirming(true)}
                style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
              >
                Regenerate link
              </button>
            ) : (
              <div role="alertdialog" aria-label="Confirm regenerate calendar link">
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                  This turns off your current link. Any calendar using it stops updating until you
                  add the new one. Regenerate?
                </p>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    onClick={() => change("PUT")}
                    disabled={busy}
                    style={{ background: "var(--error)", color: "white", border: "none" }}
                  >
                    {busy ? "Regenerating..." : "Yes, regenerate"}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    style={{ background: "var(--surface-elevated)", color: "var(--text-primary)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {notice && (
        <p role="status" style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.75rem" }}>
          {notice}
        </p>
      )}
    </section>
  );
}
