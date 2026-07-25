"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import MobileNavDrawer from "./MobileNavDrawer";
import SiteNav from "./SiteNav";
interface BaseLayoutProps {
  children: React.ReactNode;
  showHero?: boolean;
  heroTitle?: React.ReactNode;
  heroDescription?: string;
}

export default function BaseLayout({
  children,
  showHero = false,
  heroTitle = "",
  heroDescription = ""
}: BaseLayoutProps) {
  const { userType, loading: authLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const getDashboardLink = () => {
    if (userType === "player") return { href: "/player/wishlist", label: "My Wishlist" };
    return { href: "/player/login", label: "Login" };
  };
  const dashboard = getDashboardLink();

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ========== MOBILE MENU OVERLAY ========== */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        dashboard={authLoading ? null : dashboard}
        showThemeToggle
      />

      {showHero ? (
        <section className="hero-bg" style={{ minHeight: "40vh", display: "flex", flexDirection: "column" }}>
          <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />

          {heroTitle && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
              <div style={{ textAlign: "center", maxWidth: "800px" }}>
                <h1 className="hero-title font-display" style={{ marginBottom: "1rem" }}>
                  {heroTitle}
                </h1>
                {heroDescription && (
                  <p className="hero-description" style={{ margin: "0 auto" }}>
                    {heroDescription}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : (
        <SiteNav onMenuClick={() => setMobileMenuOpen(true)} />
      )}

      <main style={{ flex: 1 }}>{children}</main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
