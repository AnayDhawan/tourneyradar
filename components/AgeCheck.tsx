"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import type { AgeBasis, AgeCheckStatus } from "@/lib/guardian-consent";

type Check = { status: AgeCheckStatus; guardianEmail: string | null };

async function call(method: "GET" | "POST", body?: object): Promise<{ ok: boolean; data: any }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, data: {} };
  const res = await fetch("/api/player/age-check", {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

const bar = {
  position: "fixed" as const,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 60,
  padding: "0.75rem 1rem",
  background: "var(--surface-2, var(--background))",
  borderTop: "1px solid var(--primary)",
  color: "var(--text-primary)",
  fontSize: "0.9rem",
  display: "flex",
  gap: "0.75rem",
  alignItems: "center",
  justifyContent: "center",
  flexWrap: "wrap" as const,
};

// Asks a logged-in player the age question once (#254), collects a parent or
// guardian email for under-16 accounts, and shows where the confirmation
// stands. Mounted in the root layout so it reaches existing accounts at their
// next visit, whichever page they land on. Renders nothing for everyone else.
export default function AgeCheck() {
  const { user, userType } = useAuth();
  const isPlayer = !!user && userType === "player";
  const playerId = isPlayer ? (user as { id: string }).id : null;

  const [check, setCheck] = useState<Check | null>(null);
  const [basis, setBasis] = useState<AgeBasis | "">("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!playerId) return;
    call("GET").then(({ ok, data }) => {
      if (!cancelled && ok) setCheck({ status: data.status, guardianEmail: data.guardianEmail });
    });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const submit = useCallback(
    async (age_basis: AgeBasis, guardian_email?: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      const { ok, data } = await call("POST", { age_basis, guardian_email });
      setBusy(false);
      if (!ok) {
        setError(data.error || "Something went wrong. Try again in a moment.");
        return;
      }
      setCheck({ status: data.status, guardianEmail: data.guardianEmail });
      if (data.status === "guardian_pending") setNotice("We sent the link to your parent or guardian.");
    },
    []
  );

  // A logged-out visitor sees nothing even if an earlier player's answer is cached.
  if (!playerId || !check) return null;

  if (check.status === "unknown" || (check.status === "guardian_needed" && !check.guardianEmail)) {
    const askingExisting = check.status === "unknown";
    // An under-16 account that only lacks an email has no age question left.
    const chosen: AgeBasis | "" = askingExisting ? basis : "parental_consent";
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-check-title"
        style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      >
        <form
          className="card"
          style={{ maxWidth: "480px", width: "100%" }}
          onSubmit={(e) => {
            e.preventDefault();
            if (chosen) submit(chosen, chosen === "parental_consent" ? email : undefined);
          }}
        >
          <h2 id="age-check-title" className="font-display" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
            {askingExisting ? "One quick question" : "We need a parent or guardian's email"}
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            We ask everyone how old they are. If you are under 16, a parent or guardian has to confirm your account.
          </p>
          <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
            <legend style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Your age</legend>
            {askingExisting && (
              <label style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                <input type="radio" name="age-check-basis" required checked={basis === "16_or_older"} onChange={() => setBasis("16_or_older")} />
                I am 16 or older
              </label>
            )}
            <label style={{ display: "flex", gap: "0.5rem", color: "var(--text-secondary)" }}>
              <input
                type="radio"
                name="age-check-basis"
                required
                checked={chosen === "parental_consent"}
                onChange={() => setBasis("parental_consent")}
              />
              I am under 16
            </label>
          </fieldset>
          {chosen === "parental_consent" && (
            <div style={{ marginBottom: "1rem" }}>
              <label htmlFor="age-check-guardian" style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                Parent or guardian email *
              </label>
              <input
                id="age-check-guardian"
                type="email"
                required
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@example.com"
              />
            </div>
          )}
          {error && <p role="alert" style={{ color: "var(--error)", fontSize: "0.9rem", marginBottom: "1rem" }}>{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busy || !chosen}
            style={{ width: "100%", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  if (check.status === "guardian_needed" || check.status === "guardian_pending") {
    const pending = check.status === "guardian_pending";
    return (
      <div role="status" style={bar}>
        <span>
          {pending
            ? `Waiting for your parent or guardian (${check.guardianEmail}) to confirm. Weekly emails stay off until they do.`
            : `Your account is limited until a parent or guardian confirms it. The last link to ${check.guardianEmail} has expired.`}
        </span>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => submit("parental_consent")}>
          {busy ? "Sending..." : pending ? "Resend link" : "Send a new link"}
        </button>
        {notice && <span>{notice}</span>}
        {error && <span role="alert" style={{ color: "var(--error)" }}>{error}</span>}
      </div>
    );
  }

  return null;
}
