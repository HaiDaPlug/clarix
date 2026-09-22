"use client";

import { useEffect } from "react";
import { storedTheme } from "@/lib/theme";

/**
 * The report deck is designed on a white canvas — every slide is a white card
 * with ink set for it — so it renders in light mode whatever the app theme is.
 * Without this, a dark-mode user gets near-white text on white slides.
 *
 * The class is removed on mount and, on unmount, restored from the stored
 * preference — not from the class seen at mount, which the inline script has
 * already removed on a hard load. The preference itself is never written, so
 * leaving the report returns the app to the theme the person chose. The inline script beside this component in the
 * layout handles the hard-load case before first paint; this effect handles
 * client-side navigation, where inline scripts do not run.
 */
export function LightOnly() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark");
    return () => {
      root.classList.toggle("dark", storedTheme() === "dark");
    };
  }, []);
  return null;
}
