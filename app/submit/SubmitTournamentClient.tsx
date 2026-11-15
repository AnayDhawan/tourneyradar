"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { listCountries } from "@/lib/countryMap";
import { CATEGORIES } from "@/lib/tournament-submission";

const label = { display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" } as const;
const field = { marginBottom: "1.5rem" } as const;
const errorText = { color: "var(--error)", fontSize: "0.85rem", marginTop: "0.35rem" } as const;

type Fields = Record<string, string>;

export default function SubmitTournamentClient() {
  const { user, userType, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Fields>({});
  const [form, setForm] = useState({
    name: "",
    date: "",
    end_date: "",
    city: "",
    country_code: "",
    category: "Classical",
    fide_rated: "no",
    external_link: "",
    website: "", // honeypot, hidden from people
  });
  const countries = listCountries();

  if (loading) return null;

  if (!user || userType !== "player") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--text-primary)" }}>
          Log in to submit
        </h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Submissions need a free player account. It keeps spam out of the map.
        </p>
        <Link href="/player/login" className="btn btn-primary" style={{ textDecoration: "none", marginRight: "0.75rem" }}>
          Log in
        </Link>
        <Link href="/player/register" className="btn" style={{ textDecoration: "none" }}>
          Sign up
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--success)" }}>
          Thank you
        </h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Your tournament is waiting for review. It appears on the map once we have checked it.
        </p>
      </div>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Your session has expired. Log in again.");
        return;
      }
      const res = await fetch("/api/tournaments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          ...form,
          end_date: form.end_date || null,
          fide_rated: form.fide_rated === "yes",
        }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setFieldErrors(data.fields ?? {});
      setError(data.error || "Something went wrong. Try again in a moment.");
    } catch {
      setError("We could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} noValidate>
      <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
        For tournaments that are not listed on Chess-Results.com: a club event, a one-off local
        tournament, a federation we do not scrape. We review each one before it goes on the map.
      </p>

      {error && (
        <div role="alert" style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      <div style={field}>
        <label htmlFor="sub-name" style={label}>Tournament name *</label>
        <input id="sub-name" className="form-input" required maxLength={120} value={form.name} onChange={set("name")} />
        {fieldErrors.name && <p style={errorText}>{fieldErrors.name}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", ...field }}>
        <div>
          <label htmlFor="sub-date" style={label}>Start date *</label>
          <input id="sub-date" type="date" className="form-input" required value={form.date} onChange={set("date")} />
          {fieldErrors.date && <p style={errorText}>{fieldErrors.date}</p>}
        </div>
        <div>
          <label htmlFor="sub-end" style={label}>End date (optional)</label>
          <input id="sub-end" type="date" className="form-input" value={form.end_date} onChange={set("end_date")} />
          {fieldErrors.end_date && <p style={errorText}>{fieldErrors.end_date}</p>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", ...field }}>
        <div>
          <label htmlFor="sub-city" style={label}>City *</label>
          <input id="sub-city" className="form-input" required maxLength={100} value={form.city} onChange={set("city")} />
          {fieldErrors.city && <p style={errorText}>{fieldErrors.city}</p>}
        </div>
        <div>
          <label htmlFor="sub-country" style={label}>Country *</label>
          <select id="sub-country" className="form-input" required value={form.country_code} onChange={set("country_code")}>
            <option value="">Choose...</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          {fieldErrors.country_code && <p style={errorText}>{fieldErrors.country_code}</p>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", ...field }}>
        <div>
          <label htmlFor="sub-category" style={label}>Time control *</label>
          <select id="sub-category" className="form-input" value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {fieldErrors.category && <p style={errorText}>{fieldErrors.category}</p>}
        </div>
        <div>
          <label htmlFor="sub-fide" style={label}>FIDE rated *</label>
          <select id="sub-fide" className="form-input" value={form.fide_rated} onChange={set("fide_rated")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
          {fieldErrors.fide_rated && <p style={errorText}>{fieldErrors.fide_rated}</p>}
        </div>
      </div>

      <div style={field}>
        <label htmlFor="sub-link" style={label}>Link to the tournament page *</label>
        <input
          id="sub-link"
          type="url"
          className="form-input"
          required
          maxLength={500}
          placeholder="https://"
          value={form.external_link}
          onChange={set("external_link")}
        />
        {fieldErrors.external_link && <p style={errorText}>{fieldErrors.external_link}</p>}
      </div>

      {/* Honeypot: people never see it, bots fill every input. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="sub-website">Leave this empty</label>
        <input id="sub-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: "100%", opacity: busy ? 0.6 : 1 }}>
        {busy ? "Sending..." : "Submit for review"}
      </button>
    </form>
  );
}
