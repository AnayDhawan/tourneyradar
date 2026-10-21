"use client";

import Link from "next/link";
import BaseLayout from "@/components/BaseLayout";

export default function NotFound() {
  return (
    <BaseLayout showHero={false}>
      <section className="tournament-section not-found-section">
        <div className="not-found-inner">
          <div className="not-found-code">404</div>
          <h1 className="font-display not-found-title">Page Not Found</h1>
          <p className="not-found-text">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="not-found-actions">
            <Link href="/" className="btn btn-primary">
              Go Home
            </Link>
            <Link href="/tournaments" className="btn btn-secondary">
              Browse Tournaments
            </Link>
          </div>
        </div>
      </section>
    </BaseLayout>
  );
}
