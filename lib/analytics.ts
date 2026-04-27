import { supabase } from "./supabase";

export type AnalyticsEventType = "view" | "pdf_download" | "registration_click" | "whatsapp_click";

export async function trackEvent(tournamentId: string, eventType: AnalyticsEventType, tournamentName?: string): Promise<void> {
  try {
    // Track in Supabase
    await supabase.from("tournament_analytics").insert({
      tournament_id: tournamentId,
      event_type: eventType,
    });

    // Track in Google Analytics (if available)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventType, {
        tournament_id: tournamentId,
        tournament_name: tournamentName || 'Unknown',
        event_category: 'tournament',
      });
    }
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

export async function getAnalytics(tournamentId: string): Promise<Record<AnalyticsEventType, number>> {
  const result: Record<AnalyticsEventType, number> = {
    view: 0,
    pdf_download: 0,
    registration_click: 0,
    whatsapp_click: 0,
  };

  try {
    const { data, error } = await supabase
      .from("tournament_analytics")
      .select("event_type")
      .eq("tournament_id", tournamentId);

    if (error || !data) return result;

    for (const row of data) {
      const eventType = row.event_type as AnalyticsEventType;
      if (eventType in result) {
        result[eventType]++;
      }
    }
  } catch (error) {
    console.error("Failed to get analytics:", error);
  }

  return result;
}

export async function getAnalyticsForTournaments(tournamentIds: string[]): Promise<Record<string, Record<AnalyticsEventType, number>>> {
  const result: Record<string, Record<AnalyticsEventType, number>> = {};

  for (const id of tournamentIds) {
    result[id] = {
      view: 0,
      pdf_download: 0,
      registration_click: 0,
      whatsapp_click: 0,
    };
  }

  if (tournamentIds.length === 0) return result;

  try {
    const { data, error } = await supabase
      .from("tournament_analytics")
      .select("tournament_id, event_type")
      .in("tournament_id", tournamentIds);

    if (error || !data) return result;

    for (const row of data) {
      const tournamentId = row.tournament_id;
      const eventType = row.event_type as AnalyticsEventType;
      if (tournamentId in result && eventType in result[tournamentId]) {
        result[tournamentId][eventType]++;
      }
    }
  } catch (error) {
    console.error("Failed to get analytics:", error);
  }

  return result;
}
