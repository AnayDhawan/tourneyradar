"use client";

import { useState } from "react";
import { listCountries } from "@/lib/countryMap";
import { SUBMISSION_CATEGORIES } from "@/lib/submissions";

type Errors = Record<string, string | undefined>;

const COUNTRIES = listCountries();

const fieldStyle = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--border-color, #d1d5db)",
  background: "var(--card-bg, transparent)",
  color: "var(--text-primary)",
  fontSize: "1rem",
} as const;

const labelStyle = { display: "block", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" } as const;
const errorStyle = { color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" } as const;

export default function SubmitForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "");

    setSending(true);
    setErrors({});
    setFormError(null);
    try {
      const response = await fetch("/api/tournaments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: text("name"),
          date: text("date"),
          end_date: text("end_date"),
          city: text("city"),
          country_code: text("country_code"),
          category: text("category"),
          fide_rated: text("fide_rated") === "yes",
          organizer_name: text("organizer_name"),
          organizer_email: text("organizer_email"),
          external_link: text("external_link"),
          website: text("website"),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        setDone(true);
      } else if (response.status === 400 && body.errors) {
        setErrors(body.errors);
        setFormError(body.error ?? "Check the highlighted fields.");
      } else {
        setFormError(body.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="card" role="status" style={{ textAlign: "center" }}>
        <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
          Thanks, it is in the queue
        </h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          Your tournament will be checked by hand before it is published, so it will not appear on the
          map straight away.
        </p>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div style={{ marginBottom: "1.25rem" }}>
      <label htmlFor={name} style={labelStyle}>{label}</label>
      <input id={name} name={name} style={fieldStyle} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} {...props} />
      {errors[name] && <p id={`${name}-error`} role="alert" style={errorStyle}>{errors[name]}</p>}
    </div>
  );

  return (
    <form className="card" onSubmit={onSubmit} noValidate>
      <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
        Use this for events that are not listed on Chess-Results.com, such as a club tournament or a
        local one-off. Everything you send is reviewed before it is published.
      </p>

      {field("name", "Tournament name", { required: true, maxLength: 160, autoComplete: "off" })}
      {field("date", "Start date", { type: "date", required: true })}
      {field("end_date", "End date (optional)", { type: "date" })}
      {field("city", "City", { required: true, maxLength: 100 })}

      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="country_code" style={labelStyle}>Country</label>
        <select id="country_code" name="country_code" required defaultValue="" style={fieldStyle} aria-invalid={!!errors.country_code}>
          <option value="" disabled>Choose a country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        {errors.country_code && <p role="alert" style={errorStyle}>{errors.country_code}</p>}
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <label htmlFor="category" style={labelStyle}>Time control</label>
        <select id="category" name="category" required defaultValue="" style={fieldStyle} aria-invalid={!!errors.category}>
          <option value="" disabled>Choose one</option>
          {SUBMISSION_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.category && <p role="alert" style={errorStyle}>{errors.category}</p>}
      </div>

      <fieldset style={{ border: "none", padding: 0, margin: "0 0 1.25rem" }}>
        <legend style={labelStyle}>FIDE rated?</legend>
        <label style={{ marginRight: "1.5rem" }}><input type="radio" name="fide_rated" value="yes" /> Yes</label>
        <label><input type="radio" name="fide_rated" value="no" defaultChecked /> No</label>
      </fieldset>

      {field("organizer_name", "Organizer", { required: true, maxLength: 120 })}
      {field("organizer_email", "Organizer email (optional, only seen by the reviewer)", { type: "email", maxLength: 200 })}
      {field("external_link", "Link to the event page (optional)", { type: "url", maxLength: 500, placeholder: "https://" })}

      {/* Honeypot: people never see or fill this, bots usually do. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: "1px", height: "1px", overflow: "hidden" }}>
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {formError && <p role="alert" style={{ ...errorStyle, marginBottom: "1rem" }}>{formError}</p>}

      <button type="submit" className="btn btn-primary" disabled={sending} style={{ width: "100%" }}>
        {sending ? "Sending..." : "Submit for review"}
      </button>
    </form>
  );
}
