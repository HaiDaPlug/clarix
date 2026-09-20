"use client";

import { useEffect } from "react";

/**
 * The report deck is designed on a white canvas — every slide is a white card
 * with ink set for it — so it renders in light mode whatever the app theme is.
 * Without this, a dark-mode user gets near-white text on white slides.
 *
 * The class is removed on mount and put back on unmount, and the stored
 * preference is never touched, so leaving the report returns the app to the
 * theme the person chose. The inline script beside this component in the
 * layout handles the hard-load case before first paint; this effect handles
 * client-side navigation, where inline scripts do not run.
 */
export function LightOnly() {
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
  return null;
}
