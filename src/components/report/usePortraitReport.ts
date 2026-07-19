"use client";

import { useSyncExternalStore } from "react";

const PORTRAIT_PHONE_QUERY = "(max-width: 767px) and (orientation: portrait)";

function subscribe(callback: () => void) {
  const media = window.matchMedia(PORTRAIT_PHONE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia(PORTRAIT_PHONE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function usePortraitReport() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
