"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase";
import { useThemePreference } from "@/lib/theme";
import { readReferralCode } from "@/lib/referral";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";
export default function PlayerRegisterPage() {
  const router = useRouter();
  useThemePreference();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingEmail, setExistingEmail] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    fide_id: "",
    rating: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExistingEmail(false);
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      // Issue #177, phase 1: the profile fields ride along as user metadata.
      //
      // Harmless today, and required later. Once the auth.users trigger is in
      // place it reads these from raw_user_meta_data and creates the players
      // row itself, closing the window where an account can exist with no
      // profile. Sending them now means the trigger can be turned on without
      // a matching client deploy.
      const referredBy = readReferralCode();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone || null,
            fide_id: formData.fide_id || null,
            rating: formData.rating || null,
            referred_by: referredBy,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Registration failed");

      // Issue #170: signUp on an email that already has an auth user returns
      // that user with no error and an empty identities array, rather than
      // saying the address is taken. Supabase does this on purpose so the form
      // cannot be used to test which addresses are registered.
      //
      // Carrying on regardless is what produced the bug: the players insert
      // then failed against is_claimable_auth_user()'s 5-minute window and the
      // visitor was shown "new row violates row-level security policy for table
      // players", which tells them nothing and offers no way forward. Stop here
      // and point at the two routes that do work.
      if (authData.user.identities?.length === 0) {
        setExistingEmail(true);
        setLoading(false);
        return;
      }

      // The profile row is created by the on_auth_user_created trigger on
      // auth.users (#177), which reads the fields sent as signUp metadata
      // above. The client does not write to players at all any more, and it
      // cannot: 20260923130000_players_drop_anon_insert.sql revoked anon
      // insert and scoped the policy to authenticated.
      //
      // That is the point of the change. There is no longer a window between
      // the account existing and the profile existing, so an interrupted
      // registration cannot strand an account the way it did before.
      //
      // The referral code still rides along, captured on the homepage from a
      // `?ref=CODE` link (lib/referral.ts) and passed through the metadata. No
      // validation that it belongs to a real player; an unmatched code just
      // never counts toward anyone's referral total.

      posthog.capture("player_registered");
      setSuccess(true);
      setTimeout(() => {
        router.push("/player/onboarding");
      }, 2000);
    } catch (err: any) {
      // The raw Postgres text for an RLS refusal means nothing to a visitor,
      // and the only way to reach it now is a profile insert that lost a race
      // with the 5-minute claim window. Logging in is still the way out.
      const message: string = err?.message || "Registration failed";
      if (message.includes("row-level security")) {
        setExistingEmail(true);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} userType={null} showThemeToggle />

      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Player <span className="highlight">Registration</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card">
            {success ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)", marginBottom: "1rem" }}>
                  Registration Successful!
                </h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  Redirecting you to set up your preferences...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                  Create Player Account
                </h2>

                {error && (
                  <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                    {error}
                  </div>
                )}

                {existingEmail && (
                  <div style={{ padding: "1rem", background: "var(--surface-2, var(--background))", border: "1px solid var(--primary)", borderRadius: "12px", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                    <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                      This email is already signed up
                    </p>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                      Log in instead. If you started signing up before and never finished,
                      logging in will pick up where you left off.
                    </p>
                    <Link href="/player/login" className="btn btn-primary" style={{ display: "inline-block" }}>
                      Go to login
                    </Link>
                  </div>
                )}

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 6 characters"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      required
                      className="form-input"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      placeholder="Re-enter password"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 89761 91515"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                      FIDE ID (Optional)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.fide_id}
                      onChange={(e) => setFormData({ ...formData, fide_id: e.target.value })}
                      placeholder="e.g., 12345678"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                      Rating (Optional)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="e.g., 1500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: "100%", opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--text-secondary)" }}>
                  Already have an account?{" "}
                  <Link href="/player/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
                    Login here
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
