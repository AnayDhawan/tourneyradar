"use client";

import { useSyncExternalStore } from "react";

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

interface ThemeSnapshot {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
}

// Deterministic server-safe default — matches getStoredTheme()/getSystemTheme()'s
// own SSR fallback, so the hydration render can't mismatch the server render.
const SERVER_SNAPSHOT: ThemeSnapshot = { theme: "system", resolvedTheme: "light" };

let cachedSnapshot: ThemeSnapshot = SERVER_SNAPSHOT;

function computeSnapshot(): ThemeSnapshot {
  const theme = getStoredTheme() ?? "system";
  return { theme, resolvedTheme: resolveTheme(theme) };
}

// Reads external state (localStorage/system preference) and pushes it out
// to the DOM/storage, all outside of React render/effect state-setting -
// useSyncExternalStore, not a setState-in-effect, is what keeps this
// synchronized with React.
function refreshFromExternalSource() {
  const next = computeSnapshot();
  cachedSnapshot = next;
  applyTheme(next.theme);
}

function getSnapshot(): ThemeSnapshot {
  return cachedSnapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(callback: () => void) {
  const handleExternalChange = () => {
    refreshFromExternalSource();
    callback();
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) handleExternalChange();
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  window.addEventListener(THEME_CHANGE_EVENT, handleExternalChange);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleExternalChange);

  // Adopt the real stored/system value once mounted (server always renders
  // SERVER_SNAPSHOT, so this is the one place the "real" value takes over).
  handleExternalChange();

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handleExternalChange);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleExternalChange);
  };
}

export function useThemePreference() {
  const { theme, resolvedTheme } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setThemePreference = (nextTheme: ThemePreference) => {
    const currentResolvedTheme = applyTheme(nextTheme);
    cachedSnapshot = { theme: nextTheme, resolvedTheme: currentResolvedTheme };
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
