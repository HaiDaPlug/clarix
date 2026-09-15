// Types shared between the server-side connection module and client
// components. No server imports here so "use client" files can import it.

export type GoogleConnectionStatus =
  /** A usable (or silently refreshable) grant exists. */
  | "connected"
  /** Google rejected the grant permanently, or it is unusable. One re-auth fixes it. */
  | "reconnect_required"
  /** The user has never connected Google, or disconnected it. */
  | "disconnected"
  /** We could not determine the state right now (Google/network/server config). */
  | "error";

export type GoogleConnectionReason =
  /** Google returned invalid_grant (revoked, expired, or the 7-day Testing-mode expiry). */
  | "invalid_grant"
  /** The grant never came with a refresh token; it dies within the hour. */
  | "missing_refresh_token"
  /** The user unchecked one of the two scopes on Google's consent screen. */
  | "missing_scopes"
  /** Google 5xx / 429 / network. Temporary — nothing was marked. */
  | "google_unavailable"
  /** Server is missing SUPABASE secret key or GOOGLE_CLIENT_ID/SECRET. */
  | "server_misconfigured"
  | "not_connected";

export type GoogleConnectionHealth = {
  status: GoogleConnectionStatus;
  reason: GoogleConnectionReason | null;
  /** Scopes Google reported as granted (empty for legacy rows before first refresh). */
  scopes: string[];
  missingScopes: string[];
  connectedAt: string | null;
  lastRefreshedAt: string | null;
  tokenExpiresAt: string | null;
  /** ISO timestamp of this health evaluation. */
  checkedAt: string;
};
