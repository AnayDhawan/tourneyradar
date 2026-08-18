"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export default function DataFreshness() {
  const [lastRun, setLastRun] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("scraper_logs")
      .select("completed_at")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (!cancelled && data?.[0]?.completed_at) {
          setLastRun(
            new Date(data[0].completed_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "0.5rem" }}>
      Data last updated: {lastRun ?? "—"}{" "}
      <Link href="/status" style={{ color: "var(--primary)", textDecoration: "none" }}>
        (scraper status)
      </Link>
    </p>
  );
}