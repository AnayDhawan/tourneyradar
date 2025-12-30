"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function OrganizerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Login failed");

      // Check if organizer exists
      const { data: organizerData, error: organizerError } = await supabase
        .from("organizers")
        .select("*")
        .eq("auth_user_id", authData.user.id)
        .single();

      if (organizerError) {
        await supabase.auth.signOut();
        if (organizerError.code === 'PGRST116') {
          throw new Error("No organizer account found for this email. Please register as an organizer first.");
        }
        throw new Error("Failed to verify organizer account: " + organizerError.message);
      }

      if (!organizerData) {
        await supabase.auth.signOut();
        throw new Error("No organizer account found. Please register as an organizer.");
      }

      router.push("/organizer/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials and try again.");
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
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Organizer <span className="highlight">Login</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "500px" }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                Sign In to Your Account
              </h2>

              {error && (
                <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                  {error}
                </div>
              )}

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                  Email
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
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your password"
                />
              </div>

              <div style={{ marginBottom: "1.5rem", textAlign: "right" }}>
                <Link href="#" style={{ color: "var(--primary)", fontSize: "0.875rem" }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <div style={{ textAlign: "center", marginTop: "1.5rem", padding: "1rem", background: "var(--surface-elevated)", borderRadius: "12px" }}>
                <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                  Want to become an organizer?
                </p>
                <a
                  href="https://wa.me/918976191515?text=Hi,%20I%20want%20to%20become%20an%20organizer%20on%20TourneyRadar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  💬 Contact Us on WhatsApp
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
