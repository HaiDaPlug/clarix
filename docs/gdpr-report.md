# GDPR Notes for Shareable Reports

## Current Share-Link Safeguards

- Shared report URLs use high-entropy random tokens.
- Supabase stores only `sha256(token)` in `shared_reports.share_token_hash`, not the plaintext URL token.
- Public report lookups hash the incoming token before querying the snapshot table.
- Shared report snapshots are served from server-side code through a narrow `security definer` RPC that returns only matching snapshot JSON; the browser never receives owner tokens or service credentials.
- Invalid, expired, malformed, or missing links return the same generic error message to avoid leaking token state.
- Shared report pages are marked `noindex,nofollow`.

## Done (2026-09-20)

Migration `20260920000000_shared_reports_revoke_and_expiry.sql`.

1. ~~Owner-controlled revoke/delete for shared links.~~ `revoked_at` column; `DELETE /api/reports/share/links/[id]`; the public lookup RPC filters revoked rows, so a revoked link stops serving immediately.
2. ~~Default expiry window.~~ 90 days, set on creation from `SHARE_LINK_TTL_DAYS` in `src/lib/reports/share-links.ts`. Pre-existing permanent links were backfilled to `created_at + 90 days` rather than expired instantly, so links already sent to customers keep working for a cycle.
6. ~~Shared-links management view.~~ Settings → Delade länkar, listing workspace, period, created date, remaining days, and a revoke action.

Note: the plaintext token is not stored (only `sha256(token)`), so the management view can show that a link exists and revoke it, but can never re-display the URL. That is deliberate — a leaked database must not yield working links.

## Deferred GDPR Follow-Ups

3. Add minimal access logging without storing full tokens or unnecessary viewer personal data.
4. Add rate limiting on `/r/[token]` and `/api/reports/share`.
5. Review whether report snapshots can contain personal data, such as query strings, page URLs, or search terms, and scrub where needed.
7. Purge job for snapshots of long-expired links. Expiry currently stops them being *served*; the `report_data` JSON still sits in the table. A scheduled delete of rows past `expires_at + grace` would make retention real rather than access-only.

## Open Questions

- Should the 90-day window be configurable per workspace for agencies with longer review cycles?
- Do we need a formal data processing note for report recipients who open shared links?
