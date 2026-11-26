"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listCountries } from "@/lib/countryMap";
import { CATEGORIES } from "@/lib/tournament-submission";

// Moderation queue (issue #263). This page is only a view: it sends the
// visitor's access token to /api/admin/submissions, and the server decides
// whether they may see or change anything. Hiding the page from non-admins
// would be cosmetic; the 401 and 403 answers from the API are the gate.

interface Submission {
  id: string;
  name: string;
  date: string;
  end_date: string | null;
  city: string;
  country: string;
  country_code: string;
  category: string;
  fide_rated: boolean;
  external_link: string | null;
  created_at: string | null;
  submitter: { name: string; email: string } | null;
}

type Access = "loading" | "signed-out" | "forbidden" | "ready" | "error";
type FieldErrors = Record<string, string>;

const label = { display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" } as const;
const errorText = { color: "var(--error)", fontSize: "0.85rem", marginTop: "0.35rem" } as const;
const muted = { color: "var(--text-secondary)", fontSize: "0.9rem" } as const;

function age(createdAt: string | null): string {
  if (!createdAt) return "unknown age";
  const hours = Math.floor((Date.now() - Date.parse(createdAt)) / 3_600_000);
  if (Number.isNaN(hours) || hours < 0) return "unknown age";
  if (hours < 1) return "under an hour old";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} old`;
  return `${Math.floor(hours / 24)} days old`;
}

async function token(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export default function AdminSubmissionsClient() {
  const [access, setAccess] = useState<Access>("loading");
  const [items, setItems] = useState<Submission[]>([]);

  const load = useCallback(async () => {
    try {
      const jwt = await token();
      if (!jwt) {
        setAccess("signed-out");
        return;
      }
      const res = await fetch("/api/admin/submissions", { headers: { Authorization: `Bearer ${jwt}` } });
      if (res.status === 401) return setAccess("signed-out");
      if (res.status === 403) return setAccess("forbidden");
      if (!res.ok) return setAccess("error");
      const data: { submissions?: Submission[] } = await res.json();
      setItems(data.submissions ?? []);
      setAccess("ready");
    } catch {
      setAccess("error");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount; load() sets state after awaiting the API
    void load();
  }, [load]);

  if (access === "loading") return <p style={muted}>Loading...</p>;

  if (access === "signed-out") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={{ ...muted, marginBottom: "1.5rem" }}>Log in with an admin account to review submissions.</p>
        <Link href="/player/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Log in
        </Link>
      </div>
    );
  }

  if (access === "forbidden") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={muted}>This account is not an admin.</p>
      </div>
    );
  }

  if (access === "error") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={{ ...muted, marginBottom: "1rem" }}>Could not load the queue.</p>
        <button type="button" className="btn" onClick={() => { setAccess("loading"); void load(); }}>
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "2.5rem" }}>
        <p style={muted}>No submissions are waiting for review.</p>
      </div>
    );
  }

  return (
    <div>
      <p style={{ ...muted, marginBottom: "1rem" }}>
        {items.length} waiting. Check each against the events the scraper already has before approving.
      </p>
      {items.map((s) => (
        <SubmissionCard key={s.id} submission={s} onDone={(id) => setItems((cur) => cur.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}

type Mode = "view" | "edit" | "reject";

function SubmissionCard({ submission: s, onDone }: { submission: Submission; onDone: (id: string) => void }) {
  const [mode, setMode] = useState<Mode>("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [edit, setEdit] = useState({
    name: s.name,
    date: s.date,
    end_date: s.end_date ?? "",
    city: s.city,
    country_code: s.country_code,
    category: s.category,
    fide_rated: s.fide_rated ? "yes" : "no",
    external_link: s.external_link ?? "",
  });
  const countries = listCountries();

  const send = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const jwt = await token();
      if (!jwt) {
        setError("Your session has expired. Log in again.");
        return;
      }
      const res = await fetch(`/api/admin/submissions/${encodeURIComponent(s.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      });
      if (res.ok || res.status === 409) {
        // 409 means someone else decided it first; either way it leaves the queue.
        onDone(s.id);
        return;
      }
      const data: { error?: string; fields?: FieldErrors } = await res.json().catch(() => ({}));
      setFieldErrors(data.fields ?? {});
      setError(data.error ?? "Something went wrong. Try again in a moment.");
    } catch {
      setError("We could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const coordinates = () => (lat.trim() && lng.trim() ? { lat: Number(lat), lng: Number(lng) } : {});

  const approve = () => send({ action: "approve", note: note || undefined, ...coordinates() });
  const approveEdited = () =>
    send({
      action: "approve",
      note: note || undefined,
      edits: { ...edit, end_date: edit.end_date || null, fide_rated: edit.fide_rated === "yes" },
      ...coordinates(),
    });
  const reject = () => send({ action: "reject", reason });

  const setField = (key: keyof typeof edit) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEdit({ ...edit, [key]: e.target.value });

  const coordinateInputs = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
      <div>
        <label htmlFor={`${s.id}-lat`} style={label}>Latitude (optional)</label>
        <input id={`${s.id}-lat`} className="form-input" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
        {fieldErrors.lat && <p style={errorText}>{fieldErrors.lat}</p>}
      </div>
      <div>
        <label htmlFor={`${s.id}-lng`} style={label}>Longitude (optional)</label>
        <input id={`${s.id}-lng`} className="form-input" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} />
      </div>
      <p style={{ ...muted, gridColumn: "1 / -1", margin: 0 }}>Leave blank to place the city automatically.</p>
    </div>
  );

  return (
    <article className="card" style={{ marginBottom: "1rem", padding: "1.25rem" }}>
      <h2 className="font-display" style={{ fontSize: "1.2rem", marginBottom: "0.35rem", color: "var(--text-primary)" }}>
        {s.name}
      </h2>
      <p style={muted}>
        {s.date}{s.end_date && s.end_date !== s.date ? ` to ${s.end_date}` : ""}, {s.city}, {s.country}
      </p>
      <p style={muted}>
        {s.category}, FIDE rated: {s.fide_rated ? "yes" : "no"}
      </p>
      {s.external_link && (
        <p style={muted}>
          <a href={s.external_link} target="_blank" rel="noopener noreferrer nofollow">{s.external_link}</a>
        </p>
      )}
      <p style={{ ...muted, marginTop: "0.5rem" }}>
        Submitted by {s.submitter ? `${s.submitter.name} (${s.submitter.email})` : "a deleted account"}, {age(s.created_at)}
      </p>

      {error && (
        <div role="alert" style={{ padding: "0.75rem 1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginTop: "1rem" }}>
          {error}
        </div>
      )}

      {mode === "view" && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={approve}>
            {busy ? "Working..." : "Approve"}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => setMode("edit")}>Edit and approve</button>
          <button type="button" className="btn" disabled={busy} onClick={() => setMode("reject")}>Reject</button>
        </div>
      )}

      {mode === "edit" && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor={`${s.id}-name`} style={label}>Name</label>
              <input id={`${s.id}-name`} className="form-input" maxLength={120} value={edit.name} onChange={setField("name")} />
              {fieldErrors.name && <p style={errorText}>{fieldErrors.name}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-date`} style={label}>Start date</label>
              <input id={`${s.id}-date`} type="date" className="form-input" value={edit.date} onChange={setField("date")} />
              {fieldErrors.date && <p style={errorText}>{fieldErrors.date}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-end`} style={label}>End date</label>
              <input id={`${s.id}-end`} type="date" className="form-input" value={edit.end_date} onChange={setField("end_date")} />
              {fieldErrors.end_date && <p style={errorText}>{fieldErrors.end_date}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-city`} style={label}>City</label>
              <input id={`${s.id}-city`} className="form-input" maxLength={100} value={edit.city} onChange={setField("city")} />
              {fieldErrors.city && <p style={errorText}>{fieldErrors.city}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-country`} style={label}>Country</label>
              <select id={`${s.id}-country`} className="form-input" value={edit.country_code} onChange={setField("country_code")}>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
              {fieldErrors.country_code && <p style={errorText}>{fieldErrors.country_code}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-cat`} style={label}>Time control</label>
              <select id={`${s.id}-cat`} className="form-input" value={edit.category} onChange={setField("category")}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {fieldErrors.category && <p style={errorText}>{fieldErrors.category}</p>}
            </div>
            <div>
              <label htmlFor={`${s.id}-fide`} style={label}>FIDE rated</label>
              <select id={`${s.id}-fide`} className="form-input" value={edit.fide_rated} onChange={setField("fide_rated")}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor={`${s.id}-link`} style={label}>Link</label>
              <input id={`${s.id}-link`} type="url" className="form-input" maxLength={500} value={edit.external_link} onChange={setField("external_link")} />
              {fieldErrors.external_link && <p style={errorText}>{fieldErrors.external_link}</p>}
            </div>
          </div>
          {coordinateInputs}
          <div style={{ marginTop: "0.75rem" }}>
            <label htmlFor={`${s.id}-note`} style={label}>Note for the record (optional)</label>
            <input id={`${s.id}-note`} className="form-input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={approveEdited}>
              {busy ? "Working..." : "Save and approve"}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setMode("view")}>Cancel</button>
          </div>
        </div>
      )}

      {mode === "reject" && (
        <div style={{ marginTop: "1rem" }}>
          <label htmlFor={`${s.id}-reason`} style={label}>Reason (required, kept in the audit record)</label>
          <input id={`${s.id}-reason`} className="form-input" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          {fieldErrors.reason && <p style={errorText}>{fieldErrors.reason}</p>}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-primary" disabled={busy || reason.trim() === ""} onClick={reject}>
              {busy ? "Working..." : "Reject"}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={() => setMode("view")}>Cancel</button>
          </div>
        </div>
      )}
    </article>
  );
}
