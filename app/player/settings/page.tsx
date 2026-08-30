"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useThemePreference } from "@/lib/theme";
import Footer from "@/components/Footer";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";

const CATEGORIES = ["Classical", "Rapid", "Blitz"];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 600,
  marginBottom: "0.5rem",
  color: "var(--text-secondary)",
};

export default function PlayerSettingsPage() {
  const router = useRouter();
  const { user, userType, loading: authLoading, refreshAuth } = useAuth();
  useThemePreference();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [fideOnly, setFideOnly] = useState(false);
  const [frequency, setFrequency] = useState<"off" | "weekly">("off");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/player/login");
  }, [authLoading, user, router]);

  // Pre-fill from current user
  useEffect(() => {
    if (user && userType === "player") {
      setCategories((user as { notify_categories?: string[] }).notify_categories ?? []);
      setFideOnly((user as { min_fide_rated?: boolean }).min_fide_rated ?? false);
      setFrequency((user as { notify_frequency?: "off" | "weekly" }).notify_frequency ?? "off");
    }
  }, [user, userType]);

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const { error: updateError } = await supabase
        .from("players")
        .update({
          notify_categories: categories.length ? categories : null,
          min_fide_rated: fideOnly,
          notify_frequency: frequency,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshAuth();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your preferences");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || userType !== "player") {
    return <div style={{ background: "var(--background)", minHeight: "100vh" }} />;
  }

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <MobileNavDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} userType={null} showThemeToggle />

      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Notification <span className="highlight">Settings</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card">
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              What do you play?
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Pick the categories you care about. You can select more than one.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {CATEGORIES.map((category) => (
                <label key={category} style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)" }}>
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={() => toggleCategory(category)}
                  />
                  {category}
                </label>
              ))}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)", marginBottom: "2rem" }}>
              <input type="checkbox" checked={fideOnly} onChange={(e) => { setFideOnly(e.target.checked); setSuccess(false); }} />
              Only FIDE-rated tournaments
            </label>

            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              How often should we email you?
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Matching tournaments in your area and categories. You can change this anytime.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)" }}>
                <input type="radio" name="frequency" checked={frequency === "weekly"} onChange={() => { setFrequency("weekly"); setSuccess(false); }} />
                Weekly digest
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)" }}>
                <input type="radio" name="frequency" checked={frequency === "off"} onChange={() => { setFrequency("off"); setSuccess(false); }} />
                Don&apos;t email me
              </label>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "2rem" }}>
              &quot;Don&apos;t email me&quot; unsubscribes you from all notification emails.
            </p>

            {error && (
              <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ padding: "1rem", background: "var(--success, #16a34a)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                Preferences saved.
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", opacity: saving ? 0.6 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save preferences"}
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
