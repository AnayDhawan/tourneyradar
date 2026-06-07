"use client";

import { useThemePreference } from "@/lib/theme";



export default function ThemeToggle() {
  
  const { resolvedTheme, toggleTheme } = useThemePreference();
  return (
    <button
      type="button"
      className="theme-toggle-btn"
      aria-label="Toggle theme"
      title="Toggle theme"
      suppressHydrationWarning
      onClick={toggleTheme}
    >
      <span suppressHydrationWarning>
        {resolvedTheme === "dark" ? (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="4"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
    </button>
  );
}