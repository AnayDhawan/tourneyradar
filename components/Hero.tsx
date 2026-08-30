"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { trackEvent } from "@/lib/track";
import MapPreviewCard from "@/components/MapPreviewCard";

interface HeroTournament {
  id: string;
  lat?: number;
  lng?: number;
}

interface HeroProps {
  stats: { total: number; countries: number; mapped: number };
  tournaments: HeroTournament[];
}

// Isolated so the 60-tick count-up interval only re-renders this small
// subtree, not the whole page.
function HeroStatsLine({ stats }: { stats: HeroProps["stats"] }) {
  const [animated, setAnimated] = useState({ total: 0, countries: 0, mapped: 0 });

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

    const timer = setInterval(() => {
      step++;
      const progress = easeOutQuart(step / steps);
      setAnimated({
        total: Math.round(stats.total * progress),
        countries: Math.round(stats.countries * progress),
        mapped: Math.round(stats.mapped * progress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [stats]);

  return (
    <p className="home-hero-stats" aria-label="Site statistics">
      {animated.total} upcoming tournaments · {animated.countries} countries · {animated.mapped} on the map
    </p>
  );
}

export default function Hero({ stats, tournaments }: HeroProps) {
  const { userType, loading: authLoading } = useAuth();

  return (
    <section className="home-hero">
      <div className="home-hero-grid" aria-hidden="true" />

      <div className="home-hero-inner">
        <div className="home-hero-content">
          <h1 className="home-hero-title font-display">
            Discover Chess
            <br />
            <span className="highlight">Tournaments, Worldwide</span>
          </h1>

          <p className="home-hero-description">
            A platform aggregating over-the-board chess tournaments from around the world. Find your next event.
          </p>

          <div className="home-hero-cta">
            <Link href="/tournaments" className="btn btn-primary">
              Explore Tournaments
            </Link>
            <a
              href="https://github.com/AnayDhawan/tourneyradar"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-muted"
              onClick={() => trackEvent("star_link", { src: "hero" })}
            >
              View on GitHub
            </a>
            {!authLoading && userType !== "player" && (
              <Link href="/player/register" className="btn btn-signup">
                Sign up, it&apos;s Free!
              </Link>
            )}
          </div>

          <HeroStatsLine stats={stats} />
        </div>

        <div className="home-hero-map-wrap">
          <MapPreviewCard tournaments={tournaments} />
        </div>
      </div>
    </section>
  );
}
