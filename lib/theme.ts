"use client";

import { useEffect, useRef, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_CHANGE_EVENT = "tourneyradar:theme-change";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredTheme(): ThemePreference | null {
  if (typeof window === "undefined") return null;

  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemePreference(savedTheme) ? savedTheme : null;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: ThemePreference, systemTheme: ResolvedTheme = getSystemTheme()): ResolvedTheme {
  return theme === "system" ? systemTheme : theme;
}

function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolvedTheme = resolveTheme(theme);

  if (typeof window !== "undefined") {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  return resolvedTheme;
}

export function useThemePreference() {
  // Deterministic server-safe defaults — matches getSystemTheme()'s own SSR
  // fallback. Real stored preference (if any) is applied in the mount
  // effect below, not read here, so hydration render matches the server.
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  const isMountedRef = useRef(false);

  useEffect(() => {
    // On the true first run, adopt whatever's actually in storage before
    // persisting anything — otherwise this effect's own applyTheme() call
    // below would stamp the "system" placeholder default over a real saved
    // preference before the storage-sync effect ever gets to read it.
    const themeToApply = isMountedRef.current ? theme : getStoredTheme() ?? theme;
    isMountedRef.current = true;

    if (themeToApply !== theme) {
      setTheme(themeToApply);
      setResolvedTheme(resolveTheme(themeToApply));
    }

    applyTheme(themeToApply);

    if (themeToApply !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      const nextResolvedTheme = mediaQuery.matches ? "dark" : "light";
      setResolvedTheme(nextResolvedTheme);
      document.documentElement.setAttribute("data-theme", nextResolvedTheme);
    };

    syncSystemTheme();
    mediaQuery.addEventListener("change", syncSystemTheme);

    return () => mediaQuery.removeEventListener("change", syncSystemTheme);
  }, [theme]);

  useEffect(() => {
    const syncFromStorage = () => {
      const nextTheme = getStoredTheme();
  
      if (!nextTheme) return;
  
      setTheme(nextTheme);
      setResolvedTheme(resolveTheme(nextTheme));
      document.documentElement.setAttribute("data-theme", resolveTheme(nextTheme));
    };
  
    const handleThemeChange = () => syncFromStorage();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        syncFromStorage();
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setThemePreference = (nextTheme: ThemePreference) => {
    const currentResolvedTheme = applyTheme(nextTheme);

    setTheme(nextTheme);
    setResolvedTheme(currentResolvedTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const toggleTheme = () => {
    const nextTheme: ThemePreference = resolvedTheme === "dark" ? "light" : "dark";
    setThemePreference(nextTheme);
  };

  return {
    theme,
    resolvedTheme,
    setTheme: setThemePreference,
    toggleTheme,
  };
}
