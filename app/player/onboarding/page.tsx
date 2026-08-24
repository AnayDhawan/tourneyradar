"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import { useThemePreference } from "@/lib/theme";
import { listCountries } from "@/lib/countryMap";
import MobileNavDrawer from "@/components/MobileNavDrawer";
import SiteNav from "@/components/SiteNav";

const CATEGORIES = ["Classical", "Rapid", "Blitz"];
const TOTAL_STEPS = 3;
const COUNTRIES = listCountries();

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  fontWeight: 600,
  marginBottom: "0.5rem",
  color: "var(--text-secondary)",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "var(--surface-elevated)",
  border: "2px solid var(--border)",
  color: "var(--text-primary)",
};

export default function PlayerOnboardingPage() {
  const router = useRouter();
  const { user, userType, loading: authLoading, refreshAuth } = useAuth();
  useThemePreference();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [step, setStep] = useState(1);
  const [homeCountry, setHomeCountry] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [fideOnly, setFideOnly] = useState(false);
  const [frequency, setFrequency] = useState<"off" | "weekly">("off");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/player/login");
  }, [authLoading, user, router]);

  const toggleCategory = (category: string) => {
    setCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("players")
        .update({
          home_country_code: homeCountry || null,
          notify_categories: categories.length ? categories : null,
          min_fide_rated: fideOnly,
          notify_frequency: frequency,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshAuth();
      router.push("/player/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your preferences");
      setSaving(false);
    }
  };

  const skip = () => router.push("/player/dashboard");

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
            Welcome, <span className="highlight">{user.name?.split(" ")[0] || "player"}</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                Step {step} of {TOTAL_STEPS}
              </span>
              <button
                type="button"
                onClick={skip}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.8125rem", cursor: "pointer", textDecoration: "underline" }}
              >
                Skip for now
              </button>
            </div>

            {error && (
              <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Where are you based?
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  We&apos;ll use this to surface tournaments near you first.
                </p>
                <div style={{ marginBottom: "2rem" }}>
                  <label style={labelStyle}>Home country</label>
                  <select
                    className="form-select"
                    value={homeCountry}
                    onChange={(e) => setHomeCountry(e.target.value)}
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStep(2)}>
                  Next
                </button>
              </>
            )}

            {step === 2 && (
              <>
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
                  <input type="checkbox" checked={fideOnly} onChange={(e) => setFideOnly(e.target.checked)} />
                  Only FIDE-rated tournaments
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="button" className="btn" style={secondaryBtnStyle} onClick={() => setStep(1)}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>
                    Next
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  How often should we email you?
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Matching tournaments in your area and categories. You can change this anytime.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)" }}>
                    <input type="radio" name="frequency" checked={frequency === "weekly"} onChange={() => setFrequency("weekly")} />
                    Weekly digest
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer", color: "var(--text-primary)" }}>
                    <input type="radio" name="frequency" checked={frequency === "off"} onChange={() => setFrequency("off")} />
                    Don&apos;t email me
                  </label>
                </div>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button type="button" className="btn" style={secondaryBtnStyle} onClick={() => setStep(2)} disabled={saving}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" style={{ flex: 1, opacity: saving ? 0.6 : 1 }} onClick={finish} disabled={saving}>
                    {saving ? "Saving..." : "Finish"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
