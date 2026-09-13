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

const REFERRAL_SOURCES = ["Google search", "GitHub", "Friend / word of mouth", "Reddit", "Twitter / X", "Other"];

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
  const [categories, setCategories] = useState<string[]>([]);
  const [homeCountry, setHomeCountry] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [referralOther, setReferralOther] = useState("");
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
          notify_categories: categories.length ? categories : null,
          home_country_code: homeCountry || null,
          referral_source: referralSource === "Other" ? referralOther || "Other" : referralSource || null,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;
      await refreshAuth();
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your preferences");
      setSaving(false);
    }
  };

  const skip = () => router.push("/");

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
                  What do you play?
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Pick the categories you care about. You can select more than one.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
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
                <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={() => setStep(2)}>
                  Next
                </button>
              </>
            )}

            {step === 2 && (
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
                  How&apos;d you hear about TourneyRadar?
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Last one.
                </p>
                <div style={{ marginBottom: "2rem" }}>
                  <select
                    className="form-select"
                    value={referralSource}
                    onChange={(e) => setReferralSource(e.target.value)}
                  >
                    <option value="">Select an option</option>
                    {REFERRAL_SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                  {referralSource === "Other" && (
                    <input
                      className="form-input"
                      style={{ marginTop: "0.75rem" }}
                      placeholder="Tell us where"
                      value={referralOther}
                      onChange={(e) => setReferralOther(e.target.value)}
                    />
                  )}
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
