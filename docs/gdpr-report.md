# GDPR Notes for Shareable Reports

## Current Share-Link Safeguards

- Shared report URLs use high-entropy random tokens.
- Supabase stores only `sha256(token)` in `shared_reports.share_token_hash`, not the plaintext URL token.
- Public report lookups hash the incoming token before querying the snapshot table.
- Shared report snapshots are served from server-side code through a narrow `security definer` RPC that returns only matching snapshot JSON; the browser never receives owner tokens or service credentials.
- Invalid, expired, malformed, or missing links return the same generic error message to avoid leaking token state.
- Shared report pages are marked `noindex,nofollow`.

## Deferred GDPR Follow-Ups

These are not part of the initial share-link implementation, but should be considered before wider production use.

1. Add owner-controlled revoke/delete for shared links.
2. Add a default expiry window, for example 30 or 90 days.
3. Add minimal access logging without storing full tokens or unnecessary viewer personal data.
4. Add rate limiting on `/r/[token]` and `/api/reports/share`.
5. Review whether report snapshots can contain personal data, such as query strings, page URLs, or search terms, and scrub where needed.
6. Add a shared-links management view showing created date, period, and revoke action.

## Open Questions

- What should the default retention period be for shared report snapshots?
- Should all shared links expire automatically, or should some client-facing reports be permanent until revoked?
- Do we need a formal data processing note for report recipients who open shared links?
