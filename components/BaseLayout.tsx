"use client";

import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

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
  useEffect(() => {
    // Apply saved theme or default to system
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }, []);

  return (
    <div style={{ background: "var(--background)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {showHero ? (
        <section className="hero-bg" style={{ minHeight: "40vh", display: "flex", flexDirection: "column" }}>
          <Navigation isHero={true} />

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
        <Navigation isHero={false} />
      )}

      <main style={{ flex: 1 }}>{children}</main>

      <Footer />
      <ScrollToTop />
    </div>
  );
}