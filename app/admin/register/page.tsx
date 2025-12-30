"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
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
      // First check if email is in admins table
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("email", formData.email)
        .single();

      if (adminError || !adminData) {
        throw new Error("Your email is not in the admin list. Contact system administrator to be added.");
      }

      if (adminData.auth_user_id) {
        throw new Error("An account already exists for this admin email. Please login instead.");
      }

      // Create auth account
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!data.user) throw new Error("Registration failed");

      // Link auth_user_id to admin record
      await supabase
        .from("admins")
        .update({ auth_user_id: data.user.id })
        .eq("id", adminData.id);

      setSuccess(true);
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
            </div>
          </div>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <h1 className="hero-title font-display" style={{ textAlign: "center" }}>
            Admin <span className="highlight">Registration</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "500px" }}>
          <div className="card">
            {success ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem", color: "var(--text-primary)" }}>
                  Account Created!
                </h2>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Please check your email to verify your account, then you can login.
                </p>
                <Link href="/admin/login" className="btn btn-primary" style={{ textDecoration: "none" }}>
                  Go to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                  Create Admin Account
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                  Your email must already be in the admin list to register.
                </p>

                {error && (
                  <div style={{ padding: "1rem", background: "var(--error)", color: "white", borderRadius: "12px", marginBottom: "1.5rem" }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Email (must be in admin list)
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="admin@example.com"
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
                    placeholder="At least 6 characters"
                  />
                </div>

                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    className="form-input"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
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

                <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                  <Link href="/admin/login" style={{ color: "var(--primary)", fontSize: "0.875rem" }}>
                    Already have an account? Login →
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
