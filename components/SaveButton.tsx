"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useWishlist } from "@/lib/useWishlist";

interface Props {
  tournamentId: string;
  /** Show the "Save"/"Saved" text label next to the icon (detail page). Icon-only by default (cards/tables). */
  showLabel?: boolean;
  style?: React.CSSProperties;
}

export default function SaveButton({ tournamentId, showLabel = false, style }: Props) {
  const router = useRouter();
  const { loading: authLoading } = useAuth();
  const { savedIds, isPlayer, toggle } = useWishlist();
  const [pending, setPending] = useState(false);

  const saved = savedIds.has(tournamentId);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (authLoading || pending) return;

    if (!isPlayer) {
      router.push("/player/login");
      return;
    }

    setPending(true);
    await toggle(tournamentId);
    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      title={saved ? "Remove from wishlist" : "Save to wishlist"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        width: showLabel ? "auto" : "2.5rem",
        height: showLabel ? "auto" : "2.5rem",
        padding: showLabel ? "0.6rem 1rem" : 0,
        borderRadius: showLabel ? "10px" : "10px",
        border: "2px solid var(--border)",
        background: saved ? "var(--error)" : "var(--surface-elevated)",
        color: saved ? "white" : "var(--text-primary)",
        cursor: pending ? "default" : "pointer",
        opacity: pending ? 0.6 : 1,
        flexShrink: 0,
        fontWeight: 600,
        ...style,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {showLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
