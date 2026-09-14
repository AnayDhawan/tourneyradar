"use client";

import { useEffect, useRef } from "react";

/**
 * Renders a visible cursor dot that follows real mouse position, gated
 * behind ?demoCursor=1. Exists so screen recordings (openvidstudio, or any
 * headless-Chromium capture) show a visible pointer: Playwright drives real
 * input events, but headless Chromium renders no system cursor at all, so
 * without this every click in a capture is invisible. Renders nothing and
 * costs nothing for a real visitor; the flag is never set by any in-app link.
 */
export default function DemoCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("demoCursor")) return;

    const dot = dotRef.current;
    if (!dot) return;
    dot.style.display = "block";

    const onMove = (e: MouseEvent) => {
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    };
    const onDown = () => {
      dot.style.transform = "translate(-50%, -50%) scale(0.7)";
    };
    const onUp = () => {
      dot.style.transform = "translate(-50%, -50%) scale(1)";
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
      ref={dotRef}
      style={{
        display: "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "rgba(59, 130, 246, 0.55)",
        border: "2px solid #fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
        pointerEvents: "none",
        zIndex: 999999,
        transform: "translate(-50%, -50%) scale(1)",
        transition: "transform 80ms ease-out",
      }}
    />
  );
}
