"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a visible cursor arrow that follows real mouse position, gated
 * behind ?demoCursor=1. Exists so screen recordings (openvidstudio, or any
 * headless-Chromium capture) show a visible pointer: Playwright drives real
 * input events, but headless Chromium renders no system cursor at all, so
 * without this every click in a capture is invisible. Renders nothing and
 * costs nothing for a real visitor; the flag is never set by any in-app link.
 * Shaped like an actual pointer (same arrow used in vidstudio's own
 * CursorActor), not a dot, so it reads as a cursor in the recording.
 */
export default function DemoCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("demoCursor")) return;

    const cursor = cursorRef.current;
    if (!cursor) return;
    cursor.style.display = "block";

    const onMove = (e: MouseEvent) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    };
    const onDown = () => {
      cursor.style.transform = "scale(0.85)";
    };
    const onUp = () => {
      cursor.style.transform = "scale(1)";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      style={{
        display: "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: 28,
        height: 40,
        pointerEvents: "none",
        zIndex: 999999,
        transformOrigin: "top left",
        transition: "transform 80ms ease-out",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
      }}
    >
      <svg width="28" height="40" viewBox="0 0 28 40">
        <path
          d="M2 2 L2 32 L10 25 L15 37 L20 35 L15 23 L26 23 Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
