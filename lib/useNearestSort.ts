"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Coordinates } from "./distance";

export type NearestSortStatus = "idle" | "locating" | "active" | "denied" | "unavailable";

// Opt-in "nearest first" sort. The browser is asked for a position only when
// toggle() runs from a click, never on load. The position lives in this hook's
// React state alone: it is not written to storage, the URL, the server or
// analytics, and it disappears on reload. Any failure leaves the list in its
// normal order.
export function useNearestSort() {
  const [status, setStatus] = useState<NearestSortStatus>("idle");
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  // Ignore a late geolocation answer after the user switched the sort off.
  const attempt = useRef(0);
  useEffect(() => () => { attempt.current += 1; }, []);

  const toggle = useCallback(() => {
    attempt.current += 1;
    const mine = attempt.current;

    if (status === "active" || status === "locating") {
      setOrigin(null);
      setStatus("idle");
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (attempt.current !== mine) return;
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("active");
      },
      (err) => {
        if (attempt.current !== mine) return;
        setOrigin(null);
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }, [status]);

  return { status, origin, toggle };
}
