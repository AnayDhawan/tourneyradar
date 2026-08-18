"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";

// Talks to the existing /api/wishlist route (lib/supabase-server.ts), which
// derives the player from the caller's bearer token rather than trusting a
// client-supplied id. Every call here needs that token attached.
async function authHeader(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return { Authorization: `Bearer ${session.access_token}` };
}

/**
 * Shared wishlist state for the current player. Loads the full saved-id set
 * once (rather than once per card) and exposes an optimistic toggle that
 * calls the existing POST/DELETE /api/wishlist endpoints.
 */
export function useWishlist() {
  const { user, userType } = useAuth();
  const isPlayer = !!user && userType === "player";
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isPlayer) {
        setSavedIds(new Set());
        setLoaded(true);
        return;
      }
      const headers = await authHeader();
      if (!headers) {
        if (!cancelled) setLoaded(true);
        return;
      }
      try {
        const res = await fetch("/api/wishlist", { headers });
        if (!res.ok) throw new Error("failed to load wishlist");
        const { wishlist } = (await res.json()) as { wishlist?: { tournament_id: string }[] };
        if (!cancelled) {
          setSavedIds(new Set((wishlist || []).map((w) => w.tournament_id)));
        }
      } catch {
        // Leave savedIds empty; buttons still work, they just start unsaved.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isPlayer]);

  const toggle = useCallback(
    async (tournamentId: string): Promise<boolean> => {
      const headers = await authHeader();
      if (!headers) return false;

      const wasSaved = savedIds.has(tournamentId);
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(tournamentId);
        else next.add(tournamentId);
        return next;
      });

      try {
        const res = wasSaved
          ? await fetch(`/api/wishlist?tournament_id=${encodeURIComponent(tournamentId)}`, {
              method: "DELETE",
              headers,
            })
          : await fetch("/api/wishlist", {
              method: "POST",
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ tournament_id: tournamentId }),
            });

        if (!res.ok) throw new Error("wishlist update failed");
        return true;
      } catch {
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(tournamentId);
          else next.delete(tournamentId);
          return next;
        });
        return false;
      }
    },
    [savedIds],
  );

  return { savedIds, loaded, isPlayer, toggle };
}
