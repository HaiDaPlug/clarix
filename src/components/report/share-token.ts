"use client";

import { createContext, useContext } from "react";

/**
 * The share token when the report is being viewed through a public share link
 * (/r/[token]), null in the signed-in app. Server routes that fetch on the
 * report's behalf (page thumbnails) accept it in place of a session, and only
 * for that shared report's own site.
 */
export const ShareTokenContext = createContext<string | null>(null);

export function useShareToken(): string | null {
  return useContext(ShareTokenContext);
}
