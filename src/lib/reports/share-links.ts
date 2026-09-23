// Share-link lifetime policy, in one place so the API, the UI and the
// user-facing copy can never disagree about it.

/**
 * How long a new share link works. A report sent to a customer should keep
 * working for a normal review cycle, but a link that lives forever is a
 * standing data leak: the snapshot it serves is readable by anyone who ever
 * receives the URL, with no sign-in. 90 days is the balance, and the owner
 * can revoke sooner.
 */
export const SHARE_LINK_TTL_DAYS = 90;

export function shareLinkExpiryFrom(now: Date = new Date()): Date {
  const expires = new Date(now);
  expires.setUTCDate(expires.getUTCDate() + SHARE_LINK_TTL_DAYS);
  return expires;
}

export type ShareLinkState = "active" | "expired" | "revoked";

export function shareLinkState(
  link: { expires_at: string | null; revoked_at: string | null },
  now: Date = new Date(),
): ShareLinkState {
  if (link.revoked_at) return "revoked";
  if (link.expires_at && new Date(link.expires_at) <= now) return "expired";
  return "active";
}

/** Whole days left, floored at 0. Only meaningful for an active link. */
export function daysUntilExpiry(expiresAt: string | null, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / (24 * 60 * 60 * 1000));
}
