"use client";

import { useEffect } from "react";

const STORAGE_KEY = "mhg-portal-theme";

function applyTheme(theme: string | null) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.portalTheme = theme === "light" ? "light" : "dark";
}

export function ThemeSync() {
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    applyTheme(stored);

    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        applyTheme(event.newValue);
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
}

export function setPortalTheme(theme: "dark" | "light") {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }
  applyTheme(theme);
}

export function getStoredPortalTheme() {
  if (typeof window === "undefined") return "dark";
  return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}
