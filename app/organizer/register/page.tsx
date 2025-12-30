"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrganizerRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    organization: "",
    phone: "",
  });

  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validation
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
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Registration failed");

      // 2. Create organizer profile
      const { error: profileError } = await supabase.from("organizers").insert({
        auth_user_id: authData.user.id,
        email: formData.email,
        name: formData.name,
        organization: formData.organization || null,
        phone: formData.phone || null,
      });

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/organizer/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh" }}>
      <section className="hero-bg" style={{ minHeight: "30vh", display: "flex", flexDirection: "column" }}>
        <nav className="glass">
          <div className="nav-container">
            <Link href="/" className="nav-brand font-display" style={{ textDecoration: "none" }}>
              TourneyRadar
            </Link>

            <div className="nav-links">
              <Link href="/tournaments" style={{ textDecoration: "none" }}>Tournaments</Link>
              <Link href="/organizer/login" style={{ textDecoration: "none" }}>Organizer Login</Link>
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Organizer <span className="highlight">Registration</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "600px" }}>
          {/* Admin Warning Banner */}
          <div style={{ 
            padding: "1rem", 
            background: "var(--accent)", 
            color: "white", 
            borderRadius: "12px", 
            marginBottom: "1.5rem",
            textAlign: "center",
            fontWeight: 600
          }}>
            ⚠️ This page is for admin use only to create organizer accounts
          </div>

          <div className="card">
            {success ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--success)", marginBottom: "1rem" }}>
                  Registration Successful!
                </h2>
                <p style={{ color: "var(--text-secondary)" }}>
                  Redirecting to your dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                  Create Organizer Account
                </h2>

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

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
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

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Organization (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="Chess Club Name"
                  />
                </div>

                <div style={{ marginBottom: "2rem" }}>
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
                  <Link href="/organizer/login" style={{ color: "var(--primary)", fontWeight: 600 }}>
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