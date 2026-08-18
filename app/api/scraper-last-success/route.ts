import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data } = await supabase
    .from("scraper_logs")
    .select("completed_at")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1);

  const lastRun = data?.[0]?.completed_at?.slice(0, 10);

  return NextResponse.json(
    {
      schemaVersion: 1,
      label: "last scrape",
      message: lastRun ?? "never",
      color: lastRun ? "brightgreen" : "lightgrey",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}