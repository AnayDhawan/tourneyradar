"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminLoginPage() {
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
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!data.user) throw new Error("Login failed");

      // Check if user is admin by email
      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("*")
        .eq("email", formData.email)
        .single();

      if (adminError || !adminData) {
        await supabase.auth.signOut();
        throw new Error("Unauthorized: Your email is not in the admin list. Contact system administrator.");
      }

      // Auto-link auth_user_id if not set
      if (!adminData.auth_user_id) {
        await supabase
          .from("admins")
          .update({ auth_user_id: data.user.id })
          .eq("id", adminData.id);
      }

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
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
            Admin <span className="highlight">Login</span>
          </h1>
        </div>
      </section>

      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "500px" }}>
          <div className="card">
            <form onSubmit={handleSubmit}>
              <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                Admin Access Only
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
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: "100%", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                  First time? Your email must be in the admin list.
                </p>
                <Link href="/admin/register" style={{ color: "var(--primary)", fontSize: "0.875rem" }}>
                  Create Admin Account →
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
