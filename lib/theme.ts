"use client";

import { useEffect, useState } from "react";

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
  const initialTheme = getStoredTheme() ?? "system";
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(initialTheme));

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") return;

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
