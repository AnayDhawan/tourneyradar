"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type State = "idle" | "working" | "confirmed" | "error";

const heading = { fontSize: "1.5rem", marginBottom: "0.75rem", color: "var(--text-primary)" };
const text = { color: "var(--text-secondary)", marginBottom: "1.5rem", lineHeight: 1.6 };

// The confirmation is a button press, not a page load: an email scanner that
// opens every link in a message must not be able to confirm for the guardian.
export default function GuardianConfirmClient() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  if (!token) {
    return (
      <>
        <h2 className="font-display" style={heading}>Link not recognized</h2>
        <p style={text}>This link is incomplete. Use the button in the email we sent you.</p>
      </>
    );
  }

  const confirm = async () => {
    setState("working");
    try {
      const res = await fetch("/api/guardian/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setState("confirmed");
        return;
      }
      const body = await res.json().catch(() => ({}));
      setMessage(body.error || "Something went wrong. Try again in a moment.");
      setState("error");
    } catch {
      setMessage("We could not reach the server. Try again in a moment.");
      setState("error");
    }
  };

  if (state === "confirmed") {
    return (
      <>
        <h2 className="font-display" style={heading}>Thank you</h2>
        <p style={text}>
          The account is confirmed. Weekly tournament emails can now be sent to it. You can ask us
          to see or delete the account&apos;s data at any time by emailing dhawansanay@gmail.com.
        </p>
        <Link href="/" className="btn btn-primary" style={{ textDecoration: "none" }}>
          Go to TourneyRadar
        </Link>
      </>
    );
  }

  return (
    <>
      <h2 className="font-display" style={heading}>Confirm this account</h2>
      <p style={text}>
        A young person asked to use TourneyRadar, a chess tournament map. By confirming you agree
        to them having an account. We store their name, email and tournament preferences, as set
        out in the{" "}
        <Link href="/legal/privacy" style={{ color: "var(--primary)" }}>privacy policy</Link>.
      </p>
      {state === "error" && (
        <p role="alert" style={{ ...text, color: "var(--error)" }}>{message}</p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={confirm}
        disabled={state === "working"}
        style={{ opacity: state === "working" ? 0.6 : 1 }}
      >
        {state === "working" ? "Confirming..." : "I agree, confirm the account"}
      </button>
    </>
  );
}
