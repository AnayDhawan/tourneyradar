"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useThemePreference } from "@/lib/theme";
import { readReferralCode } from "@/lib/referral";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";

// The way out of a half-finished signup (issue #170).
//
// An auth user can exist with no matching players row: the tab was closed, the
// network dropped, or the insert failed between supabase.auth.signUp() and the
// profile insert on the register page. That account used to be stuck. Register
// refused it because is_claimable_auth_user() only allows claiming an auth user
// created in the last 5 minutes, and login authenticated it and then signed it
// straight back out for having no profile.
//
// With a session in hand the insert is allowed by the first branch of
// players_insert_own (auth_user_id = auth.uid()), no 5-minute window involved,
// so this page finishes what registration started.
//
// useAuth is deliberately not the gate here. It reports a user with a session
// but no players row as logged out, which is exactly the visitor this page is
// for, so the session is read straight from Supabase instead.
export default function CompleteProfilePage() {
  const router = useRouter();
  useThemePreference();
  const { refreshAuth } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    fide_id: "",
    rating: "",
  });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/player/login");
        return;
      }

      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (existing) {
        router.replace("/player/wishlist");
        return;
      }

      setEmail(session.user.email ?? "");
      setAuthUserId(session.user.id);
      setChecking(false);
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUserId) return;

    setError(null);
    setSaving(true);

    try {
      const { error: profileError } = await supabase.from("players").insert({
        auth_user_id: authUserId,
        email,
        name: formData.name,
        phone: formData.phone || null,
        fide_id: formData.fide_id || null,
        rating: formData.rating ? parseInt(formData.rating) : null,
        referred_by: readReferralCode(),
      });

      if (profileError) throw profileError;

      posthog.capture("player_profile_completed");
      await refreshAuth();
      router.push("/player/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your profile");
      setSaving(false);
    }
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} userType={null} showThemeToggle />

      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Finish your <span className="highlight">profile</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card">
            {checking ? (
              <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                Checking your account...
              </p>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                  Almost there
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Your account for {email} was created but the profile never finished saving.
                  Fill this in once and you are done.
                </p>

                {error && (
                  <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                    {error}
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
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ width: "100%", opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Finish setting up"}
                </button>

                <p style={{ textAlign: "center", marginTop: "1.5rem", color: "var(--text-secondary)" }}>
                  Wrong account?{" "}
                  <Link href="/player/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
                    Log in as someone else
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
